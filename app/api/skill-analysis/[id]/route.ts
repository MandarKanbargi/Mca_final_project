import { MongoClient, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const MONGODB_URI = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.MONGODB_DB || "ats_database"}?retryWrites=true&w=majority`;

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db(process.env.MONGODB_DB || "ats_database");
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - User not authenticated" },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection("skill_analyses");

    const analysis = await collection.findOne({
      _id: new ObjectId(params.id),
      user_id: userId,
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(analysis, { status: 200 });
  } catch (error) {
    console.error("[API] Error fetching analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch analysis" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - User not authenticated" },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection("skill_analyses");

    const result = await collection.deleteOne({
      _id: new ObjectId(params.id),
      user_id: userId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Analysis deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API] Error deleting analysis:", error);
    return NextResponse.json(
      { error: "Failed to delete analysis" },
      { status: 500 }
    );
  }
}
