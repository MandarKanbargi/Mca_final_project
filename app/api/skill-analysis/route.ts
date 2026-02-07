import { MongoClient, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const MONGODB_URI = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.MONGODB_DB || "ats_database"}?retryWrites=true&w=majority`;

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db(process.env.MONGODB_DB || "ats_database");
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - User not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();

    console.log("[API] POST /api/skill-analysis - Saving for user:", userId);

    const db = await getDatabase();
    const collection = db.collection("skill_analyses");

    const document = {
      user_id: userId,
      resume_text: body.resume_text,
      job_description: body.job_description,
      matched_skills: body.matched_skills,
      missing_skills: body.missing_skills,
      extra_skills: body.extra_skills,
      match_percentage: body.match_percentage,
      roadmap: body.roadmap,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await collection.insertOne(document);

    console.log("[API] Data saved successfully with ID:", result.insertedId);

    return NextResponse.json(
      {
        id: result.insertedId.toString(),
        message: "Analysis saved successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] Error saving analysis:", error);
    return NextResponse.json(
      { error: "Failed to save analysis" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - User not authenticated" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");

    console.log("[API] GET /api/skill-analysis - Fetching history for user:", userId);

    const db = await getDatabase();
    const collection = db.collection("skill_analyses");

    const analyses = await collection
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(analyses, { status: 200 });
  } catch (error) {
    console.error("[API] Error fetching history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
