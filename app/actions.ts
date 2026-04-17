"use server";

import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { auth } from "@clerk/nextjs/server";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

function buildRoadmapPrompt(missingSkills: string[]): string {
  return `Create a detailed 2-week learning roadmap for these missing skills: ${missingSkills.join(", ")}

IMPORTANT: Organize by PRIORITY and DIFFICULTY LEVEL:
- Week 1: FUNDAMENTALS & BASICS - Start with foundational concepts and prerequisite knowledge
- Week 2: ADVANCED & PRACTICAL - Build on Week 1 with complex topics and hands-on projects

Structure the roadmap as follows:

## Week 1: Fundamentals & Basics
Focus: Core concepts, theory, and foundational knowledge that are prerequisites
- Start with the easiest and most fundamental skills
- Build a strong theoretical foundation
- Cover basic syntax, concepts, and principles

###  [Topic]
- Time: [X hours]
- [What to learn - basic concept] | [Reference URL]
- [What to learn - foundational topic] | [Reference URL]
- [What to learn - introductory material] | [Reference URL]

## Week 2: Advanced & Practical Application
Focus: Complex topics, real-world projects, and advanced implementation
- Build on Week 1 fundamentals
- Apply knowledge through projects
- Master advanced features and best practices

###  [Topic]
- Time: [X hours]
- [What to learn - advanced concept] | [Reference URL]
- [What to learn - practical project] | [Reference URL]
- [What to learn - real-world application] | [Reference URL]

CRITICAL: USE ONLY THESE RELIABLE, ALWAYS-WORKING SOURCES:

1. **W3Schools** - Main sections:
   - https://www.w3schools.com/html/
   - https://www.w3schools.com/css/
   - https://www.w3schools.com/js/
   - https://www.w3schools.com/python/
   - https://www.w3schools.com/react/
   - https://www.w3schools.com/nodejs/
   - https://www.w3schools.com/sql/
   - https://www.w3schools.com/java/
   - https://www.w3schools.com/cpp/
   - https://www.w3schools.com/c/
   - https://www.w3schools.com/php/
   - https://www.w3schools.com/jquery/
   - https://www.w3schools.com/bootstrap/
   - https://www.w3schools.com/typescript/

2. **MDN Web Docs** - Main documentation pages:
   - https://developer.mozilla.org/en-US/docs/Web/HTML
   - https://developer.mozilla.org/en-US/docs/Web/CSS
   - https://developer.mozilla.org/en-US/docs/Web/JavaScript
   - https://developer.mozilla.org/en-US/docs/Web/API
   - https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
   - https://developer.mozilla.org/en-US/docs/Web/Accessibility

3. **Official Documentation** (main landing pages):
   - React: https://react.dev/learn
   - Python: https://docs.python.org/3/
   - Node.js: https://nodejs.org/docs/
   - Java: https://docs.oracle.com/javase/tutorial/
   - TypeScript: https://www.typescriptlang.org/docs/
   - Next.js: https://nextjs.org/docs
   - Express.js: https://expressjs.com/

4. **GeeksforGeeks** - Main topic pages:
   - https://www.geeksforgeeks.org/data-structures/
   - https://www.geeksforgeeks.org/algorithms/
   - https://www.geeksforgeeks.org/python-programming-language/
   - https://www.geeksforgeeks.org/java/
   - https://www.geeksforgeeks.org/c-plus-plus/
   - https://www.geeksforgeeks.org/c-programming-language/
   - https://www.geeksforgeeks.org/javascript/
   - https://www.geeksforgeeks.org/html/
   - https://www.geeksforgeeks.org/css/
   - https://www.geeksforgeeks.org/reactjs-tutorials/
   - https://www.geeksforgeeks.org/nodejs/
   - https://www.geeksforgeeks.org/machine-learning/
   - https://www.geeksforgeeks.org/artificial-intelligence/
   - https://www.geeksforgeeks.org/web-development/
   - https://www.geeksforgeeks.org/django-tutorial/
   - https://www.geeksforgeeks.org/flask-tutorial/

5. **Microsoft Learn** (for .NET, C#, Azure):
   - https://learn.microsoft.com/en-us/dotnet/
   - https://learn.microsoft.com/en-us/azure/
   - https://learn.microsoft.com/en-us/windows/
   - https://learn.microsoft.com/en-us/sql/

STRICT RULES:
- ONLY use the EXACT URLs listed above - do not create or modify URLs
- Each resource line MUST be formatted as: "[What to learn in detail] | [EXACT URL from the list above]"
- EVERY learning item MUST have a working link from the approved list
- If a topic doesn't perfectly match an approved URL, choose the closest relevant one
- DO NOT invent, modify, or create new URLs - only use the exact URLs provided
- Week 1 MUST contain only BASIC, FOUNDATIONAL topics
- Week 2 MUST contain ADVANCED, PRACTICAL topics that build on Week 1
- Each day should have 2-3 learning resources with working links
- Include realistic time estimates for each day

Example with VALID links for ALL content:
## Week 1: Fundamentals & Basics
### Day 1: Introduction to React Basics
- Time: 3-4 hours
- Learn what React is, its component-based architecture, and how it uses Virtual DOM | https://react.dev/learn
- Understand JSX syntax, how to write components, and the rules of JSX expressions | https://www.w3schools.com/react/
- Master the concept of props for passing data between components | https://www.geeksforgeeks.org/reactjs-tutorials/

### Day 2: JavaScript ES6+ Fundamentals
- Time: 3-4 hours
- Learn arrow functions, template literals, and how they simplify JavaScript syntax | https://www.w3schools.com/js/
- Understand array methods like map, filter, and reduce for data manipulation | https://developer.mozilla.org/en-US/docs/Web/JavaScript
- Practice destructuring objects and arrays to extract values efficiently | https://www.geeksforgeeks.org/javascript/

Keep it practical, progressive, and actionable with WORKING links for EVERY learning item from the approved sources only.`;
}

const API_BASE_URL = normalizeBackendUrl(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
);

function normalizeBackendUrl(url: string) {
  let normalized = url.trim();
  normalized = normalized.replace(/\/+$|\s+$/g, "");
  normalized = normalized.replace(/\/api$/, "");
  return normalized;
}

async function saveToMongoDB(analysisData: {
  resume_text: string;
  job_description: string;
  matched_skills: string[];
  missing_skills: string[];
  extra_skills: string[];
  match_percentage: number;
  roadmap: string;
}) {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.error("[MongoDB] No userId available - user not authenticated");
      return null;
    }

    console.log("[MongoDB] Attempting to save data for user:", userId);

    const response = await fetch(`${API_BASE_URL}/api/skill-analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        "x-api-key": process.env.CLERK_SECRET_KEY || "",
      },
      body: JSON.stringify({
        ...analysisData,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[MongoDB] Save failed:", response.status, errorText);
      return null;
    }

    const result = await response.json();
    console.log("[MongoDB] Data saved successfully:", result.id);
    return result;
  } catch (error) {
    console.error("[MongoDB] Error saving to database:", error);
    return null;
  }
}

export async function analyzeSkillMatchFromPDFs(
  resumeFile: File,
  jobDescriptionFile: File,
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.error("[PDF] No userId available - user not authenticated");
      throw new Error("User not authenticated. Please sign in to continue.");
    }

    console.log("[PDF] User authenticated:", userId);

    // First, send PDFs to backend to extract text
    const formData = new FormData();
    formData.append("resume_pdf", resumeFile);
    formData.append("job_description_pdf", jobDescriptionFile);

    console.log("[PDF] Sending PDFs to backend for extraction...");

    const extractResponse = await fetch(`${API_BASE_URL}/api/analyze-pdf`, {
      method: "POST",
      headers: {
        "x-user-id": userId,
        "x-api-key": process.env.CLERK_SECRET_KEY || "",
      },
      body: formData,
    });

    console.log("[PDF] Backend response status:", extractResponse.status);

    if (!extractResponse.ok) {
      const errorText = await extractResponse.text();
      console.error(
        "[PDF] Extraction failed:",
        extractResponse.status,
        errorText,
      );
      throw new Error(`Failed to extract text from PDFs: ${errorText}`);
    }

    const extractResult = await extractResponse.json();
    console.log("[PDF] Text extracted successfully");

    // Now proceed with the skill analysis using the extracted text
    return await analyzeSkillMatch(
      extractResult.resume_text,
      extractResult.job_description_text,
    );
  } catch (error) {
    console.error("[PDF] Error processing PDFs:", error);

    if (error instanceof Error && /fetch failed/i.test(error.message)) {
      throw new Error(
        `Unable to reach backend service at ${API_BASE_URL}. ` +
          "Make sure the backend server is running and that NEXT_PUBLIC_API_URL is set correctly.",
      );
    }

    throw error;
  }
}

export async function analyzeSkillMatch(
  resume: string,
  jobDescription: string,
) {
  const prompt = `You are an expert ATS skill-matching engine. Your job is to extract skills from the Resume and compare them with the Job Description (JD) with high accuracy.

Follow these steps STRICTLY:

1. Extract Skills from RESUME:
   - Only list skills that are explicitly mentioned.
   - Do NOT assume or infer skills.
   - Look for: Technical Skills, Soft Skills, Tools & Technologies, Programming Languages, Frameworks, Libraries

2. Extract Required Skills from JD:
   - Identify all required skills stated in the JD.
   - Include: Required technical skills, Preferred skills, Tools, frameworks, libraries, Soft skills

3. Compare Resume vs JD SKILLS:
   - Mark as MATCHED: Skills that appear in BOTH resume AND job description (exact or close equivalent)
   - Mark as MISSING: Skills required in JD but NOT found in resume
   - Mark as EXTRA: Skills in resume but NOT required by JD (bonus skills the candidate has)
   - Be STRICT and ACCURATE in classification

4. Return ONLY valid JSON in this EXACT format (no markdown, no extra text):
{
  "matched": ["skill1", "skill2"],
  "missing": ["skill3", "skill4"],
  "extra": ["skill5", "skill6"]
}

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Return ONLY the JSON object, nothing else.`;

  const { text } = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    prompt,
    maxOutputTokens: 2000,
  });

  console.log("[v0] Raw AI response received, length:", text.length);

  let skillsData;
  try {
    // Remove markdown code blocks if present
    let cleanText = text.trim();
    cleanText = cleanText.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    // Find JSON object
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    // Clean control characters and parse
    const jsonStr = jsonMatch[0]
      .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
      .replace(/\n/g, " ") // Replace newlines with spaces
      .replace(/\r/g, ""); // Remove carriage returns

    skillsData = JSON.parse(jsonStr);
    console.log("[v0] Parsed skills data:", skillsData);
  } catch (error) {
    console.error("[v0] Error parsing skills JSON:", error);
    skillsData = {
      matched: [],
      missing: [],
      extra: [],
    };
  }

  const totalRequired =
    (skillsData.matched?.length || 0) + (skillsData.missing?.length || 0);
  const matchPercentage =
    totalRequired > 0
      ? ((skillsData.matched?.length || 0) / totalRequired) * 100
      : 0;

  let roadmap = "";
  if (skillsData.missing && skillsData.missing.length > 0) {
    const roadmapPrompt = buildRoadmapPrompt(skillsData.missing);

    const roadmapResponse = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: roadmapPrompt,
      maxOutputTokens: 3000,
    });

    roadmap = roadmapResponse.text;
    console.log("[v0] Generated roadmap");
  } else {
    roadmap =
      "Great! You already have all the required skills. Focus on building projects to demonstrate your expertise.";
  }

  // Save to MongoDB
  const mongoResult = await saveToMongoDB({
    resume_text: resume,
    job_description: jobDescription,
    matched_skills: skillsData.matched || [],
    missing_skills: skillsData.missing || [],
    extra_skills: skillsData.extra || [],
    match_percentage: matchPercentage,
    roadmap: roadmap,
  });

  if (mongoResult) {
    console.log(
      "[v0] Successfully saved to MongoDB with ID:",
      mongoResult.id || mongoResult.analysis_id,
    );
  } else {
    console.warn(
      "[v0] Failed to save to MongoDB, but continuing with analysis",
    );
  }

  return {
    matched: skillsData.matched || [],
    missing: skillsData.missing || [],
    extra: skillsData.extra || [],
    roadmap,
    matchPercentage,
    savedToDatabase: !!mongoResult, // Include save status in response
  };
}
