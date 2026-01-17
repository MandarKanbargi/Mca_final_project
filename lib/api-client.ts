import { auth } from "@clerk/nextjs/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SkillAnalysisData {
  resume_text: string;
  job_description: string;
  matched_skills: string[];
  missing_skills: string[];
  extra_skills: string[];
  match_percentage: number;
  roadmap?: string;
}

async function getAuthToken() {
  const { getToken } = await auth();
  const token = await getToken();
  return token;
}

export async function saveSkillAnalysis(data: SkillAnalysisData) {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}/api/skill-analysis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to save analysis");
  }

  return response.json();
}

export async function getUserHistory(limit: number = 10) {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/skill-analysis/history?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch history");
  }

  return response.json();
}

export async function getAnalysisById(analysisId: string) {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/skill-analysis/${analysisId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch analysis");
  }

  return response.json();
}

export async function deleteAnalysis(analysisId: string) {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/skill-analysis/${analysisId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete analysis");
  }

  return response.json();
}
