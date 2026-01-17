# test_api.py - Place this in your backend folder
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

load_dotenv()

async def test_mongodb_connection():
    """Test if MongoDB connection works"""
    print("\n=== Testing MongoDB Connection ===")
    
    try:
        # Get MongoDB credentials
        MONGODB_USER = os.getenv("MONGODB_USER")
        MONGODB_PASSWORD = os.getenv("MONGODB_PASSWORD")
        MONGODB_HOST = os.getenv("MONGODB_HOST", "localhost:27017")
        MONGODB_DB = os.getenv("MONGODB_DB", "ats_database")
        
        # Build connection string
        if MONGODB_USER and MONGODB_PASSWORD:
            encoded_user = quote_plus(MONGODB_USER)
            encoded_password = quote_plus(MONGODB_PASSWORD)
            MONGODB_URL = f"mongodb+srv://{encoded_user}:{encoded_password}@{MONGODB_HOST}/{MONGODB_DB}?retryWrites=true&w=majority"
        else:
            MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        
        print(f"Connecting to: {MONGODB_HOST}")
        
        # Create client
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client[MONGODB_DB]
        
        # Test connection
        await db.command("ping")
        print("✅ MongoDB connection successful!")
        
        # List all collections
        collections = await db.list_collection_names()
        print(f"\n📦 Available collections: {collections}")
        
        # Check skill_analyses collection
        if "skill_analyses" in collections:
            count = await db.skill_analyses.count_documents({})
            print(f"📊 Total documents in skill_analyses: {count}")
            
            # Get sample documents
            if count > 0:
                print("\n📄 Sample documents:")
                cursor = db.skill_analyses.find().limit(3)
                docs = await cursor.to_list(length=3)
                for i, doc in enumerate(docs, 1):
                    print(f"\nDocument {i}:")
                    print(f"  - ID: {doc.get('_id')}")
                    print(f"  - User ID: {doc.get('user_id')}")
                    print(f"  - Match %: {doc.get('match_percentage')}")
                    print(f"  - Matched Skills: {len(doc.get('matched_skills', []))}")
                    print(f"  - Missing Skills: {len(doc.get('missing_skills', []))}")
        else:
            print("⚠️  skill_analyses collection doesn't exist yet")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ MongoDB connection failed: {str(e)}")
        return False


async def test_insert_sample_data():
    """Insert sample data to test storage"""
    print("\n=== Testing Data Insertion ===")
    
    try:
        MONGODB_USER = os.getenv("MONGODB_USER")
        MONGODB_PASSWORD = os.getenv("MONGODB_PASSWORD")
        MONGODB_HOST = os.getenv("MONGODB_HOST", "localhost:27017")
        MONGODB_DB = os.getenv("MONGODB_DB", "ats_database")
        
        if MONGODB_USER and MONGODB_PASSWORD:
            encoded_user = quote_plus(MONGODB_USER)
            encoded_password = quote_plus(MONGODB_PASSWORD)
            MONGODB_URL = f"mongodb+srv://{encoded_user}:{encoded_password}@{MONGODB_HOST}/{MONGODB_DB}?retryWrites=true&w=majority"
        else:
            MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client[MONGODB_DB]
        
        # Sample test data
        test_data = {
            "user_id": "test_user_123",
            "resume_text": "Test resume content",
            "job_description": "Test job description",
            "matched_skills": ["Python", "FastAPI", "MongoDB"],
            "missing_skills": ["React", "TypeScript"],
            "extra_skills": ["Docker"],
            "match_percentage": 75.5,
            "roadmap": "Test roadmap content"
        }
        
        result = await db.skill_analyses.insert_one(test_data)
        print(f"✅ Test document inserted with ID: {result.inserted_id}")
        
        # Verify insertion
        doc = await db.skill_analyses.find_one({"_id": result.inserted_id})
        if doc:
            print("✅ Document verified in database")
            print(f"   User ID: {doc['user_id']}")
            print(f"   Match %: {doc['match_percentage']}")
        
        # Clean up test data
        await db.skill_analyses.delete_one({"_id": result.inserted_id})
        print("🧹 Test document cleaned up")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ Data insertion failed: {str(e)}")
        return False


async def check_clerk_setup():
    """Check Clerk configuration"""
    print("\n=== Checking Clerk Configuration ===")
    
    clerk_secret = os.getenv("CLERK_SECRET_KEY")
    clerk_publishable = os.getenv("CLERK_PUBLISHABLE_KEY")
    
    if clerk_secret:
        print(f"✅ CLERK_SECRET_KEY is set (length: {len(clerk_secret)})")
    else:
        print("❌ CLERK_SECRET_KEY is not set")
    
    if clerk_publishable:
        print(f"✅ CLERK_PUBLISHABLE_KEY is set (length: {len(clerk_publishable)})")
    else:
        print("❌ CLERK_PUBLISHABLE_KEY is not set")


async def main():
    print("=" * 60)
    print("ATS Backend Testing Suite")
    print("=" * 60)
    
    # Check Clerk setup
    await check_clerk_setup()
    
    # Test MongoDB connection
    connection_ok = await test_mongodb_connection()
    
    # If connection is OK, test insertion
    if connection_ok:
        await test_insert_sample_data()
    
    print("\n" + "=" * 60)
    print("Testing Complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())