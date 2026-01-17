from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv
import httpx
from urllib.parse import quote_plus

load_dotenv()

app = FastAPI()

# CORS Configuration - Add your Next.js URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://your-app.vercel.app"  # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Configuration with proper URL encoding
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")

# If you're using username/password authentication, encode them properly
# Example for MongoDB Atlas or authenticated connection:
MONGODB_USER = os.getenv("MONGODB_USER")
MONGODB_PASSWORD = os.getenv("MONGODB_PASSWORD")
MONGODB_HOST = os.getenv("MONGODB_HOST", "localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "ats_database")

if MONGODB_USER and MONGODB_PASSWORD:
    # Encode username and password
    encoded_user = quote_plus(MONGODB_USER)
    encoded_password = quote_plus(MONGODB_PASSWORD)
    MONGODB_URL = f"mongodb+srv://{encoded_user}:{encoded_password}@{MONGODB_HOST}/{MONGODB_DB}?retryWrites=true&w=majority"

client = AsyncIOMotorClient(MONGODB_URL)
db = client.ats_database  # Your database name

# Clerk Configuration
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_PUBLISHABLE_KEY = os.getenv("CLERK_PUBLISHABLE_KEY")


# Verify Clerk JWT Token
async def verify_clerk_token(authorization: str = Header(None)):
    """Verify Clerk session token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header")
    
    try:
        token = authorization.replace("Bearer ", "")
        
        # Verify with Clerk API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.clerk.com/v1/sessions/{token}/verify",
                headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid token")
            
            session_data = response.json()
            return session_data.get("user_id")
    
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")


# Pydantic Models
class SkillAnalysis(BaseModel):
    user_id: str
    resume_text: str
    job_description: str
    matched_skills: List[str]
    missing_skills: List[str]
    extra_skills: List[str]
    match_percentage: float
    roadmap: Optional[str] = None


class SkillAnalysisCreate(BaseModel):
    resume_text: str
    job_description: str
    matched_skills: List[str]
    missing_skills: List[str]
    extra_skills: List[str]
    match_percentage: float
    roadmap: Optional[str] = None


# Routes
@app.get("/")
async def root():
    return {"message": "ATS Backend API", "status": "running"}


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check MongoDB connection
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.post("/api/skill-analysis")
async def save_skill_analysis(
    analysis: SkillAnalysisCreate,
    user_id: str = Depends(verify_clerk_token)
):
    """Save skill analysis result"""
    try:
        analysis_data = analysis.dict()
        analysis_data["user_id"] = user_id
        
        result = await db.skill_analyses.insert_one(analysis_data)
        
        return {
            "success": True,
            "analysis_id": str(result.inserted_id),
            "message": "Analysis saved successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving analysis: {str(e)}")


@app.get("/api/skill-analysis/history")
async def get_user_history(
    limit: int = 10,
    user_id: str = Depends(verify_clerk_token)
):
    """Get user's analysis history"""
    try:
        cursor = db.skill_analyses.find({"user_id": user_id}).sort("_id", -1).limit(limit)
        analyses = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for analysis in analyses:
            analysis["_id"] = str(analysis["_id"])
        
        return {
            "success": True,
            "count": len(analyses),
            "analyses": analyses
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")


@app.get("/api/skill-analysis/{analysis_id}")
async def get_analysis(
    analysis_id: str,
    user_id: str = Depends(verify_clerk_token)
):
    """Get specific analysis by ID"""
    try:
        from bson import ObjectId
        
        analysis = await db.skill_analyses.find_one({
            "_id": ObjectId(analysis_id),
            "user_id": user_id
        })
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        analysis["_id"] = str(analysis["_id"])
        
        return {
            "success": True,
            "analysis": analysis
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching analysis: {str(e)}")


@app.delete("/api/skill-analysis/{analysis_id}")
async def delete_analysis(
    analysis_id: str,
    user_id: str = Depends(verify_clerk_token)
):
    """Delete analysis"""
    try:
        from bson import ObjectId
        
        result = await db.skill_analyses.delete_one({
            "_id": ObjectId(analysis_id),
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        return {
            "success": True,
            "message": "Analysis deleted successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting analysis: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)