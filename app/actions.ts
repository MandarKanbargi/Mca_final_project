"use server"

import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function analyzeSkillMatch(resume: string, jobDescription: string) {
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

Return ONLY the JSON object, nothing else.`

  const { text } = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    prompt,
    maxTokens: 2000,
  })

  console.log("[v0] Raw AI response:", text)

  let skillsData
  try {
    // Remove markdown code blocks if present
    let cleanText = text.trim()
    cleanText = cleanText.replace(/```json\n?/g, "").replace(/```\n?/g, "")

    // Find JSON object
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No JSON found in response")
    }

    // Clean control characters and parse
    const jsonStr = jsonMatch[0]
      .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
      .replace(/\n/g, " ") // Replace newlines with spaces
      .replace(/\r/g, "") // Remove carriage returns

    skillsData = JSON.parse(jsonStr)
    console.log("[v0] Parsed skills data:", skillsData)
  } catch (error) {
    console.error("[v0] Error parsing skills JSON:", error)
    skillsData = {
      matched: [],
      missing: [],
      extra: [],
    }
  }

  const totalRequired = (skillsData.matched?.length || 0) + (skillsData.missing?.length || 0)
  const matchPercentage = totalRequired > 0 ? ((skillsData.matched?.length || 0) / totalRequired) * 100 : 0

  let roadmap = ""
  if (skillsData.missing && skillsData.missing.length > 0) {
    const roadmapPrompt = `Create a detailed 2-week learning roadmap for these missing skills: ${skillsData.missing.join(", ")}

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

CRITICAL REQUIREMENTS FOR REFERENCE LINKS - USE ONLY THESE SOURCES (in priority order):

1. **W3Schools** (https://www.w3schools.com/) - For HTML, CSS, JavaScript, Python, SQL, React
   - Example: https://www.w3schools.com/react/
   - Example: https://www.w3schools.com/python/

2. **Microsoft Learn/Docs** (https://learn.microsoft.com/ or https://docs.microsoft.com/) - For .NET, C#, Azure, TypeScript
   - Example: https://learn.microsoft.com/en-us/dotnet/csharp/
   - Example: https://learn.microsoft.com/en-us/azure/

3. **GeeksforGeeks** (https://www.geeksforgeeks.org/) - For algorithms, data structures, programming concepts
   - Example: https://www.geeksforgeeks.org/data-structures/
   - Example: https://www.geeksforgeeks.org/python-programming-language/

4. **MDN Web Docs** (https://developer.mozilla.org/) - For web technologies (JavaScript, CSS, HTML, Web APIs)
   - Example: https://developer.mozilla.org/en-US/docs/Web/JavaScript
   - Example: https://developer.mozilla.org/en-US/docs/Web/CSS

5. **Official Documentation** (when freely accessible):
   - React: https://react.dev/learn
   - Python: https://docs.python.org/3/
   - Node.js: https://nodejs.org/docs/
   - Java: https://docs.oracle.com/javase/tutorial/

6. **freeCodeCamp** (https://www.freecodecamp.org/news/) - For comprehensive tutorials
   - Example: https://www.freecodecamp.org/news/learn-javascript-full-course/

7. **Tutorialspoint** (https://www.tutorialspoint.com/) - For programming tutorials
   - Example: https://www.tutorialspoint.com/java/

8. **Programiz** (https://www.programiz.com/) - For programming basics
   - Example: https://www.programiz.com/python-programming

RULES:
- ONLY use main landing pages and section pages from these domains
- DO NOT use specific blog URLs or dated articles that might get removed
- Prefer W3Schools for web technologies, Microsoft for .NET/Azure, GeeksforGeeks for algorithms
- Week 1 MUST contain only BASIC, FOUNDATIONAL topics
- Week 2 MUST contain ADVANCED, PRACTICAL topics that build on Week 1
- Each resource line MUST be formatted as: "[What to learn in detail] | [Full valid URL from above sources]"
- Each day should have 3-4 learning resources
- Include realistic time estimates for each day

Example with VALID links from approved sources:
## Week 1: Fundamentals & Basics
### Day 1: Introduction to React Basics
- Time: 3-4 hours
- Learn what React is, its component-based architecture, and how it uses Virtual DOM | https://www.w3schools.com/react/
- Understand JSX syntax, how to write components, and the rules of JSX expressions | https://react.dev/learn/writing-markup-with-jsx
- Master the concept of props for passing data between components | https://www.geeksforgeeks.org/reactjs-props-set-1/

### Day 2: JavaScript ES6+ Fundamentals
- Time: 3-4 hours
- Learn arrow functions, template literals, and how they simplify JavaScript syntax | https://www.w3schools.com/js/js_es6.asp
- Understand array methods like map, filter, and reduce for data manipulation | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
- Practice destructuring objects and arrays to extract values efficiently | https://www.geeksforgeeks.org/destructuring-assignment-in-javascript/

Keep it practical, progressive, and actionable with WORKING links from APPROVED sources only.`

    const roadmapResponse = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: roadmapPrompt,
      maxTokens: 3000,
    })

    roadmap = roadmapResponse.text
    console.log("[v0] Generated roadmap")
  } else {
    roadmap =
      "Great! You already have all the required skills. Focus on building projects to demonstrate your expertise."
  }

  return {
    matched: skillsData.matched || [],
    missing: skillsData.missing || [],
    extra: skillsData.extra || [],
    roadmap,
    matchPercentage,
  }
}
