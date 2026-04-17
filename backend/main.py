from fastapi import FastAPI, HTTPException, Header, Depends, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv
import urllib.parse
from PyPDF2 import PdfReader
import io
import uvicorn

load_dotenv()

app = FastAPI()

# MongoDB setup
MONGODB_USER = os.getenv("MONGODB_USER")
MONGODB_PASSWORD = os.getenv("MONGODB_PASSWORD")
MONGODB_HOST = os.getenv("MONGODB_HOST")
MONGODB_DB = os.getenv("MONGODB_DB", "ats_database")
MONGODB_URI = os.getenv("MONGODB_URI") or os.getenv("MONGODB_URL")


def build_mongodb_uri():
    if MONGODB_URI:
        return MONGODB_URI

    if not (MONGODB_USER and MONGODB_PASSWORD and MONGODB_HOST):
        return None

    encoded_user = urllib.parse.quote_plus(MONGODB_USER)
    encoded_password = urllib.parse.quote_plus(MONGODB_PASSWORD)
    return f"mongodb+srv://{encoded_user}:{encoded_password}@{MONGODB_HOST}/{MONGODB_DB}?retryWrites=true&w=majority"


def log_env_warnings():
    missing = []
    if not os.getenv("CLERK_SECRET_KEY"):
        missing.append("CLERK_SECRET_KEY")
    if not (MONGODB_URI or (MONGODB_USER and MONGODB_PASSWORD and MONGODB_HOST)):
        missing.append("MONGODB_URI or MONGODB_USER/MONGODB_PASSWORD/MONGODB_HOST")
    if missing:
        print("[Config] Missing environment variables:", ", ".join(missing))


MONGODB_URI = build_mongodb_uri()
log_env_warnings()

print(f"[MongoDB] Connecting to database: {MONGODB_DB}")
print(f"[MongoDB] Host: {MONGODB_HOST}")
print(f"[MongoDB] User: {MONGODB_USER}")
print(f"[MongoDB] URI source: {'MONGODB_URI' if os.getenv('MONGODB_URI') else 'built from separate vars' if (MONGODB_USER and MONGODB_PASSWORD and MONGODB_HOST) else 'none'}")

client = None
collection = None
db = None

if MONGODB_URI:
    try:
        client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000,
            socketTimeoutMS=10000,
            tls=True,
            tlsAllowInvalidCertificates=True
        )

        db = client[MONGODB_DB]
        collection = db["skill_analyses"]

        # Test connection
        client.admin.command('ping')
        print(f"[MongoDB] SUCCESS: Connected to {MONGODB_DB}")
        print("[MongoDB] SUCCESS: Collection: skill_analyses")
    except Exception as e:
        print(f"[MongoDB] ERROR: Connection failed: {e}")
        print("[MongoDB] Check your credentials and network access in MongoDB Atlas")
        db = None
        collection = None
else:
    print("[MongoDB] ERROR: No MongoDB URI available; please set MONGODB_URI or MONGODB_USER/MONGODB_PASSWORD/MONGODB_HOST")

def extract_text_from_pdf(pdf_file: UploadFile) -> str:
    """Extract text content from a PDF file"""
    try:
        # Read the file content
        pdf_content = pdf_file.file.read()
        
        # Create a PDF reader object
        pdf_reader = PdfReader(io.BytesIO(pdf_content))
        
        # Extract text from all pages
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error extracting text from PDF: {str(e)}")

# Pydantic model for request validation
class SkillAnalysisRequest(BaseModel):
    resume_text: str
    job_description: str
    matched_skills: List[str]
    missing_skills: List[str]
    extra_skills: List[str]
    match_percentage: float
    roadmap: str
    user_id: str

# Simple authentication dependency
async def verify_clerk_auth(
    x_user_id: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None)
):
    """Verify authentication using API key"""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="Missing API key")
    
    # Verify it matches your Clerk Secret Key
    expected_secret = os.getenv("CLERK_SECRET_KEY")
    
    if not expected_secret:
        raise HTTPException(status_code=500, detail="Server configuration error")
    
    if x_api_key != expected_secret:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing user ID")
    
    return x_user_id

@app.post("/api/analyze-pdf")
async def analyze_pdf_skills(
    resume_pdf: UploadFile = File(...),
    job_description_pdf: UploadFile = File(...),
    user_id: str = Depends(verify_clerk_auth)
):
    """Analyze skills from PDF files"""
    try:
        # Extract text from PDFs
        resume_text = extract_text_from_pdf(resume_pdf)
        job_description_text = extract_text_from_pdf(job_description_pdf)
        
        return {
            "success": True,
            "resume_text": resume_text,
            "job_description_text": job_description_text,
            "user_id": user_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDFs: {str(e)}")

@app.post("/api/skill-analysis")
async def save_skill_analysis(
    analysis: SkillAnalysisRequest,
    user_id: str = Depends(verify_clerk_auth)
):
    """Save skill analysis to MongoDB"""
    if collection is None:
        raise HTTPException(status_code=503, detail="Database connection not available")
    
    try:
        # Verify user_id in body matches the authenticated user
        if analysis.user_id != user_id:
            raise HTTPException(status_code=403, detail="User ID mismatch")
        
        # Create document
        document = {
            "user_id": user_id,
            "resume_text": analysis.resume_text,
            "job_description": analysis.job_description,
            "matched_skills": analysis.matched_skills,
            "missing_skills": analysis.missing_skills,
            "extra_skills": analysis.extra_skills,
            "match_percentage": analysis.match_percentage,
            "roadmap": analysis.roadmap,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Debug logging
        print(f"[MongoDB] Saving to database: {db.name}")
        print(f"[MongoDB] Collection: {collection.name}")
        print(f"[MongoDB] User ID: {user_id}")
        
        # Insert into MongoDB
        result = collection.insert_one(document)
        inserted_id = str(result.inserted_id)
        
        # Verify insertion
        verify_doc = collection.find_one({"_id": result.inserted_id})
        if verify_doc:
            print(f"[MongoDB] SUCCESS: Document verified in database")
            print(f"[MongoDB] SUCCESS: Database: {db.name}, Collection: {collection.name}")
        else:
            print("[MongoDB] ERROR: Document NOT found after insert!")
        
        return {
            "success": True,
            "id": inserted_id,
            "analysis_id": inserted_id,
            "database": db.name,
            "collection": collection.name,
            "message": "Skill analysis saved successfully"
        }
        
    except Exception as e:
        print(f"[MongoDB] Error saving to database: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/skill-analysis/{user_id}")
async def get_user_analyses(
    user_id: str,
    authenticated_user: str = Depends(verify_clerk_auth)
):
    """Get all skill analyses for a user"""
    if collection is None:
        raise HTTPException(status_code=503, detail="Database connection not available")
    
    # Verify the authenticated user is requesting their own data
    if user_id != authenticated_user:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        analyses = list(collection.find(
            {"user_id": user_id}
        ).sort("created_at", -1))
        
        # Convert ObjectId to string
        for analysis in analyses:
            analysis["_id"] = str(analysis["_id"])
        
        print(f"[MongoDB] Found {len(analyses)} analyses for user {user_id}")
        
        return {
            "success": True,
            "count": len(analyses),
            "database": db.name,
            "collection": collection.name,
            "analyses": analyses
        }
    except Exception as e:
        print(f"[MongoDB] Error fetching data: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/debug/database-info")
async def debug_database_info():
    """Debug endpoint to check database connection and contents"""
    if collection is None:
        return {
            "connected": False,
            "error": "Database connection not established"
        }
    
    try:
        # List all databases
        db_list = client.list_database_names()
        
        # List collections
        collections = db.list_collection_names()
        
        # Count documents
        doc_count = collection.count_documents({})
        
        # Get sample document
        sample_doc = collection.find_one()
        if sample_doc:
            sample_doc["_id"] = str(sample_doc["_id"])
        
        return {
            "connected": True,
            "current_database": db.name,
            "available_databases": db_list,
            "collections_in_current_db": collections,
            "skill_analyses_count": doc_count,
            "sample_document": sample_doc
        }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }

# CORS middleware 
from fastapi.middleware.cors import CORSMiddleware

@app.get("/")
async def root():
    return {
        "status": "ok",
        "mongodb_connected": collection is not None,
        "database": db.name if db is not None else None,
        "collection": collection.name if collection is not None else None
    }

CORS_ALLOWED_ORIGINS = os.getenv("BACKEND_CORS_ORIGINS", "*")
if CORS_ALLOWED_ORIGINS.strip() == "*":
    allow_origins = ["*"]
else:
    allow_origins = [origin.strip() for origin in CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)