"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Sparkles,
  BookOpen,
  TrendingUp,
  ArrowLeft,
  Download,
  Clock,
  FileText,
  Cpu,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { analyzeSkillMatch } from "./actions";

// --- Types ---
interface SkillResult {
  matched: string[];
  missing: string[];
  extra: string[];
  roadmap: string;
  matchPercentage: number;
}

interface Day {
  title: string;
  duration: string;
  resources: Array<{ topic: string; link: string }>;
}

interface Week {
  title: string;
  subtitle: string;
  days: Day[];
}

// --- Helper Functions ---
function parseRoadmap(roadmap: string): Week[] {
  const weeks: Week[] = [];
  const lines = roadmap.split("\n");

  let currentWeek: Week | null = null;
  let currentDay: Day | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.match(/^##?\s*Week\s*\d+/i)) {
      if (currentWeek && currentDay) {
        currentWeek.days.push(currentDay);
        currentDay = null;
      }
      if (currentWeek) {
        weeks.push(currentWeek);
      }
      const weekMatch = trimmedLine.match(/Week\s*(\d+)[:\s]*(.*)$/i);
      currentWeek = {
        title: `Week ${weekMatch?.[1] || weeks.length + 1}`,
        subtitle: weekMatch?.[2] || "Focus Period",
        days: [],
      };
    } else if (trimmedLine.match(/^###?\s*Day\s*\d+/i)) {
      if (currentDay && currentWeek) {
        currentWeek.days.push(currentDay);
      }
      const dayMatch = trimmedLine.match(/Day\s*(\d+)[:\s]*(.*)$/i);
      currentDay = {
        title: dayMatch?.[2] || trimmedLine,
        duration: "",
        resources: [],
      };
    } else if (currentDay && trimmedLine.match(/[-–]\s*Time:/i)) {
      const timeMatch = trimmedLine.match(/Time:\s*(.+)$/i);
      if (timeMatch) {
        currentDay.duration = timeMatch[1];
      }
    } else if (currentDay && trimmedLine.match(/[-–]\s*.+\|.+/)) {
      const parts = trimmedLine.replace(/^[-–]\s*/, "").split("|");
      if (parts.length >= 2) {
        const topic = parts[0].trim();
        const link = parts[1].trim();
        currentDay.resources.push({ topic, link });
      }
    }
  }

  if (currentDay && currentWeek) {
    currentWeek.days.push(currentDay);
  }
  if (currentWeek) {
    weeks.push(currentWeek);
  }

  if (weeks.length === 0) {
    weeks.push({
      title: "Week 1",
      subtitle: "Getting Started",
      days: [
        {
          title: "Review the complete roadmap details",
          duration: "Self-paced",
          resources: [],
        },
      ],
    });
  }

  return weeks;
}

// --- Components ---

function RoadmapDisplay({ roadmap }: { roadmap: string }) {
  const weeks = parseRoadmap(roadmap);

  return (
    <div className="space-y-12 relative">
      {/* Connecting Line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-blue-500 to-transparent opacity-30 md:left-10" />

      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="relative z-10">
          <div className="overflow-hidden rounded-xl border border-cyan-500/30 bg-[#0B1120]/80 backdrop-blur-md shadow-[0_0_30px_-10px_rgba(6,182,212,0.15)]">
            <div className="border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 to-transparent p-6">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 text-xl font-extrabold text-white shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
                  W{weekIndex + 1}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    {week.title}
                  </h3>
                  <p className="text-sm font-medium text-cyan-400">
                    {week.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              {week.days.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className="group relative rounded-lg border border-white/5 bg-white/5 p-5 transition-all hover:border-cyan-500/40 hover:bg-white/10"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-md font-bold text-cyan-400 ring-1 ring-cyan-500/30">
                      D{dayIndex + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="mb-2 text-xl font-bold text-slate-200 group-hover:text-cyan-200 transition-colors">
                        {day.title}
                      </h4>
                      {day.duration && (
                        <p className="mb-3 flex items-center gap-2 text-sm uppercase tracking-wider text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span className="font-medium">{day.duration}</span>
                        </p>
                      )}
                      {day.resources.length > 0 && (
                        <div className="space-y-2 mt-4 pl-4 border-l-2 border-cyan-500/20">
                          {day.resources.map((resource, resIndex) => (
                            <div
                              key={resIndex}
                              className="flex items-start gap-2 text-md"
                            >
                              <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-500" />
                              <div className="flex-1">
                                <span className="text-slate-300">
                                  {resource.topic}
                                </span>
                                {resource.link && (
                                  <a
                                    href={resource.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline decoration-cyan-500/30 underline-offset-4"
                                  >
                                    OPEN RESOURCE →
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultsView({
  result,
  onBack,
}: {
  result: SkillResult;
  onBack: () => void;
}) {
  const getMatchMessage = (percentage: number) => {
    if (percentage >= 70) return "High Compatibility.";
    if (percentage >= 50) return "Moderate Compatibility.";
    return "Low Compatibility.";
  };

  const handleDownloadPDF = () => {
    // Create HTML content for PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Skill Match Report - ${result.matchPercentage.toFixed(1)}%</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #ffffff;
        }
        h1 {
            color: #4f46e5;
            font-size: 32px;
            margin-bottom: 8px;
        }
        h2 {
            color: #334155;
            font-size: 24px;
            margin-top: 40px;
            margin-bottom: 20px;
            border-bottom: 3px solid #4f46e5;
            padding-bottom: 8px;
        }
        h3 {
            color: #475569;
            font-size: 20px;
            margin-top: 24px;
            margin-bottom: 12px;
        }
        h4 {
            color: #64748b;
            font-size: 16px;
            margin-top: 16px;
            margin-bottom: 8px;
        }
        .score-box {
            background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
            border: 2px solid #4f46e5;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .score {
            font-size: 64px;
            font-weight: bold;
            color: #4f46e5;
            margin: 10px 0;
        }
        .message {
            font-size: 16px;
            color: #64748b;
            margin-top: 10px;
        }
        .skills-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 30px 0;
        }
        .skill-card {
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            background: #f8fafc;
        }
        .skill-card h3 {
            margin-top: 0;
            font-size: 18px;
        }
        .skill-item {
            padding: 8px 12px;
            margin: 6px 0;
            border-radius: 6px;
            font-size: 14px;
            font-family: 'Courier New', monospace;
        }
        .matched {
            background: #d1fae5;
            color: #065f46;
        }
        .missing {
            background: #fee2e2;
            color: #991b1b;
        }
        .extra {
            background: #dbeafe;
            color: #1e40af;
        }
        .roadmap {
            margin-top: 40px;
        }
        .week {
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            margin: 30px 0;
            padding: 20px;
            background: #ffffff;
        }
        .week-header {
            font-size: 22px;
            font-weight: bold;
            color: #4f46e5;
            margin-bottom: 16px;
        }
        .day {
            border-left: 4px solid #4f46e5;
            padding-left: 16px;
            margin: 20px 0;
        }
        .day-title {
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 8px;
        }
        .resource {
            padding: 6px 0;
            color: #475569;
            font-size: 14px;
        }
        .resource a {
            color: #4f46e5;
            text-decoration: none;
            font-weight: 600;
        }
        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #94a3b8;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <h1>🎯 Skill Match Report</h1>
    <p style="color: #64748b; font-size: 16px;">Generated on ${new Date().toLocaleDateString()}</p>
    
    <div class="score-box">
        <div style="font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase;">Your Match Score</div>
        <div class="score">${result.matchPercentage.toFixed(1)}%</div>
        <div class="message">${getMatchMessage(result.matchPercentage)}</div>
    </div>

    <h2>📊 Skills Analysis</h2>
    <div class="skills-grid">
        <div class="skill-card">
            <h3 style="color: #059669;">✓ Matched Skills (${result.matched.length})</h3>
            ${result.matched.map((skill) => `<div class="skill-item matched">${skill}</div>`).join("")}
        </div>
        <div class="skill-card">
            <h3 style="color: #dc2626;">✗ Missing Skills (${result.missing.length})</h3>
            ${result.missing.map((skill) => `<div class="skill-item missing">${skill}</div>`).join("")}
        </div>
        <div class="skill-card">
            <h3 style="color: #2563eb;">+ Extra Skills (${result.extra.length})</h3>
            ${result.extra.map((skill) => `<div class="skill-item extra">${skill}</div>`).join("")}
        </div>
    </div>

    <div class="roadmap">
        <h2>🗺️ Your 2-Week Learning Roadmap</h2>
        ${formatRoadmapForPDF(result.roadmap)}
    </div>

    <div class="footer">
        <p>Generated by ATS Skill Matcher | Keep learning and growing! 🚀</p>
    </div>
</body>
</html>
    `;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `skill-match-roadmap-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const formatRoadmapForPDF = (roadmap: string): string => {
    const lines = roadmap.split("\n");
    let html = "";
    let inWeek = false;
    let inDay = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.match(/^##?\s*Week\s*\d+/i)) {
        if (inDay) html += "</div>";
        if (inWeek) html += "</div>";
        const weekMatch = trimmed.match(/Week\s*(\d+)[:\s]*(.*)$/i);
        html += `<div class="week"><div class="week-header">Week ${weekMatch?.[1] || ""}: ${weekMatch?.[2] || "Learning Period"}</div>`;
        inWeek = true;
        inDay = false;
      } else if (trimmed.match(/^###?\s*Day\s*\d+/i)) {
        if (inDay) html += "</div>";
        const dayMatch = trimmed.match(/Day\s*(\d+)[:\s]*(.*)$/i);
        html += `<div class="day"><div class="day-title">Day ${dayMatch?.[1] || ""}: ${dayMatch?.[2] || trimmed}</div>`;
        inDay = true;
      } else if (trimmed.match(/[-–]\s*Time:/i)) {
        const timeMatch = trimmed.match(/Time:\s*(.+)$/i);
        if (timeMatch) {
          html += `<div style="color: #64748b; font-size: 14px; margin-bottom: 8px;">⏱️ ${timeMatch[1]}</div>`;
        }
      } else if (trimmed.match(/[-–]\s*.+\|.+/)) {
        const parts = trimmed.replace(/^[-–]\s*/, "").split("|");
        if (parts.length >= 2) {
          const topic = parts[0].trim();
          const link = parts[1].trim();
          html += `<div class="resource">📚 ${topic} <a href="${link}" target="_blank">→ Reference</a></div>`;
        }
      }
    }

    if (inDay) html += "</div>";
    if (inWeek) html += "</div>";

    return html || "<p>No roadmap available.</p>";
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#020617] to-[#020617]" />

      <div className="relative z-10 border-b border-white/10 bg-[#020617]/80 backdrop-blur-md sticky top-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-cyan-400 text-md hover:text-cyan-300 hover:bg-cyan-950/30"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleDownloadPDF}
            className="bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400/20 shadow-[0_0_15px_rgba(8,145,178,0.4)]"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-12">
        {/* Score Section */}
        <div className="mb-12 relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#0B1221]/90 p-10 text-center shadow-[0_0_50px_-12px_rgba(6,182,212,0.25)]">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(6,182,212,0.05)_50%,transparent_75%)] bg-[length:250%_250%] animate-pulse" />

          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-cyan-500">
            Analysis Complete
          </p>
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 blur-xl bg-cyan-700/20 rounded-full" />
            <p className="relative text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-500">
              {result.matchPercentage.toFixed(1)}%
            </p>
          </div>

          <div className="mx-auto mt-8 mb-4 h-2 max-w-xl overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 shadow-[0_0_10px_rgba(34,211,238,0.6)]"
              style={{ width: `${result.matchPercentage}%` }}
            />
          </div>
          <p className="text-lg text-cyan-200/70 font-mono">
            {getMatchMessage(result.matchPercentage)}
          </p>
        </div>

        <div className="mb-16 grid gap-8 lg:grid-cols-3">
          {/* Matched Skills - Green/Emerald to match Image */}
          <div className="group rounded-2xl border border-emerald-500/30 bg-[#0B1221] shadow-[0_0_20px_-5px_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.2)] transition-all">
            <div className="border-b border-emerald-500/20 bg-emerald-950/10 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                <h3 className="text-lg font-bold text-emerald-100">
                  Matched Skills
                </h3>
                <span className="bg-emerald-500/20 text-emerald-100 text-md ml-4 px-2 py-1 rounded font-mono">
                  {result.matched.length}
                </span>
              </div>
            </div>
            <div className="p-6 flex flex-wrap gap-2">
              {result.matched.map((skill, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-sm font-mono shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Missing Skills - Red/Rose to match Image */}
          <div className="group rounded-2xl border border-rose-500/30 bg-[#0B1221] shadow-[0_0_20px_-5px_rgba(244,63,94,0.1)] hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.2)] transition-all">
            <div className="border-b border-rose-500/20 bg-rose-950/10 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <XCircle className="h-6 w-6 text-rose-400" />
                <h3 className="text-lg font-bold text-rose-100">
                  Missing Skills
                </h3>
                <span className="bg-rose-400/20 text-rose-100 ml-5 text-md px-2 py-1 rounded font-mono">
                  {result.missing.length}
                </span>
              </div>
            </div>
            <div className="p-6 flex flex-wrap gap-2">
              {result.missing.map((skill, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-200 text-sm font-mono shadow-[0_0_10px_rgba(244,63,94,0.1)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Extra Skills - Amber/Yellow to match Image */}
          <div className="group rounded-2xl border border-amber-500/30 bg-[#080E1A] shadow-2xl relative overflow-hidden">
            <div className="border-b border-amber-500/20 bg-amber-950/10 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Plus className="h-6 w-6 text-amber-400" />
                <h3 className="text-lg font-bold text-amber-100">
                  Extra Skills
                </h3>
                <span className="bg-amber-500/20 text-amber-200 text-md ml-7 px-2 py-1 rounded font-mono">
                  {result.extra.length}
                </span>
              </div>
            </div>
            <div className="p-6 flex flex-wrap gap-2">
              {result.extra.map((skill, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm font-mono shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Roadmap Display */}
        <div className="rounded-3xl border border-cyan-500/20 bg-[#080E1A] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="mb-12 relative z-10">
            <h2 className="text-3xl font-bold text-white mb-2">
              Learning Protocol
            </h2>
            <p className="text-slate-400">
              Execute the following sequence to bridge skill gaps.
            </p>
          </div>

          <RoadmapDisplay roadmap={result.roadmap} />
        </div>
      </div>
    </div>
  );
}

// --- Main Page Component ---
export default function SkillMatchPage() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SkillResult | null>(null);

  const handleAnalyze = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const analysis = await analyzeSkillMatch(resume, jobDescription);
      setResult(analysis);
    } catch (error) {
      console.error("Error analyzing skills:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setResume("");
    setJobDescription("");
  };

  if (result) {
    return <ResultsView result={result} onBack={handleReset} />;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30 relative overflow-x-hidden">
      {/* --- Ambient Background Effects --- */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,_#1e3a8a_0%,_#020617_45%)] z-0 pointer-events-none" />
      <div className="fixed top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 z-20" />

      {/* Header */}
      <header className="relative z-20 border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-36 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/50">
              <Cpu className="h-6 w-6 text-cyan-400 animate-pulse" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Nexus<span className="text-cyan-400">ATS</span>
            </span>
          </div>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "w-8 h-8",
              },
            }}
          />
        </div>
      </header>

      <div className="relative z-10 px-6 py-12 lg:py-20">
        {/* Hero Section */}
        <div className="mx-auto max-w-6xl mb-20">
          <div className="text-center mb-16 relative">
            {/* Glowing orb effect behind title */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-600/10 blur-[80px] rounded-full -z-10" />

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 drop-shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              Match Skills.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Upgrade Career.
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-slate-400 mb-5 leading-relaxed">
              Advanced AI processing to bridge the gap between your current
              capabilities and your target directive.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <div className="flex items-center gap-2.5 text-cyan-400 ">
                <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />

                <span className="font-semibold">Accurate Matching</span>
              </div>

              <div className="flex items-center gap-2.5 text-cyan-400">
                <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />

                <span className="font-semibold">2-Week Roadmap</span>
              </div>

              <div className="flex items-center gap-2.5 text-cyan-400">
                <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />

                <span className="font-semibold">Free Document Resource</span>
              </div>
            </div>
          </div>

          {/* THE IMAGE from User */}
          <div className="relative mx-auto max-w-4xl aspect-[16/9] rounded-2xl overflow-hidden border border-cyan-500/20 shadow-[0_0_40px_-10px_rgba(6,182,212,0.1)] group">
            {/* Scanline effect overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] pointer-events-none z-10 opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent z-10" />

            <img
              src="home.png"
              alt="AI Skill Processing Visualization"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        </div>

        {/* Input Interface */}
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* === RESUME INPUT (Cyan Theme) === */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-500" />
              <div className="relative h-full rounded-2xl bg-[#0B1120] border border-white/10 p-1">
                <div className="border-b border-white/5 p-4 bg-white/5 rounded-t-xl flex items-center gap-3">
                  <FileText className="h-5 w-5 text-cyan-400" />
                  <span className="font-semibold text-cyan-50">
                    Update Resume
                  </span>
                </div>
                <div className="p-4">
                  <Textarea
                    placeholder="Paste your resume text here..."
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    className="min-h-[300px] bg-transparent border-none text-slate-300 placeholder:text-white-600 focus-visible:ring-0 resize-none font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* === JOB DESCRIPTION INPUT (Purple Theme) === */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-500" />
              <div className="relative h-full rounded-2xl bg-[#0B1120] border border-white/10 p-1">
                <div className="border-b border-white/5 p-4 bg-white/5 rounded-t-xl flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                  <span className="font-semibold text-purple-50">
                    Upload Job Description
                  </span>
                </div>
                <div className="p-4">
                  <Textarea
                    placeholder="Paste the job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="min-h-[300px] bg-transparent border-none text-slate-300 placeholder:text-white-800 focus-visible:ring-0 resize-none font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 flex justify-center">
            <Button
              size="lg"
              onClick={handleAnalyze}
              disabled={isLoading || !resume.trim() || !jobDescription.trim()}
              className="relative overflow-hidden bg-cyan-600 hover:bg-cyan-600 text-white px-10 py-8 text-xl font-bold rounded-xl shadow-[0_0_30px_-10px_rgba(6,182,212,0.6)] transition-all hover:scale-105 hover:shadow-[0_0_30px_-10px_rgba(6,182,212,0.8)] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none group"
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] group-hover:animate-[shimmer_2s_linear_infinite]" />
              <span className="relative flex items-center gap-3">
                {isLoading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Processing Data.....
                  </>
                ) : (
                  <>
                    <Sparkles className="h-6 w-6 fill-white" />
                    Analyze Results
                  </>
                )}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
