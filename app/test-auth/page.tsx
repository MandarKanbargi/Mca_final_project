// app/test-auth/page.tsx - Create this file to test authentication
"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function TestAuthPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [apiStatus, setApiStatus] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });

  const testBackendConnection = async () => {
    setApiStatus({
      status: "loading",
      message: "Testing backend connection...",
    });

    try {
      // Get the session token
      const token = await getToken();

      // Test the health endpoint
      const healthResponse = await fetch("http://localhost:8000/api/health");
      const healthData = await healthResponse.json();

      if (healthData.status === "healthy") {
        setApiStatus({
          status: "success",
          message: `Backend connected! Database: ${healthData.database}`,
        });
      } else {
        setApiStatus({
          status: "error",
          message: "Backend responded but database is not connected",
        });
      }
    } catch (error) {
      setApiStatus({
        status: "error",
        message: `Backend connection failed: ${error}`,
      });
    }
  };

  const testSaveData = async () => {
    setApiStatus({ status: "loading", message: "Testing data save..." });

    try {
      const token = await getToken();

      const testData = {
        resume_text: "Test resume - Python, JavaScript, MongoDB",
        job_description: "Test JD - Python, React, MongoDB",
        matched_skills: ["Python", "MongoDB"],
        missing_skills: ["React"],
        extra_skills: ["JavaScript"],
        match_percentage: 66.67,
        roadmap: "Test roadmap content",
      };

      const response = await fetch("http://localhost:8000/api/skill-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(testData),
      });

      const data = await response.json();

      if (response.ok) {
        setApiStatus({
          status: "success",
          message: `Data saved! Analysis ID: ${data.analysis_id}`,
        });
      } else {
        setApiStatus({
          status: "error",
          message: `Save failed: ${data.detail}`,
        });
      }
    } catch (error) {
      setApiStatus({
        status: "error",
        message: `Error: ${error}`,
      });
    }
  };

  const testGetHistory = async () => {
    setApiStatus({ status: "loading", message: "Fetching history..." });

    try {
      const token = await getToken();

      const response = await fetch(
        "http://localhost:8000/api/skill-analysis/history",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setApiStatus({
          status: "success",
          message: `Found ${data.count} analyses in database`,
        });
      } else {
        setApiStatus({
          status: "error",
          message: `Fetch failed: ${data.detail}`,
        });
      }
    } catch (error) {
      setApiStatus({
        status: "error",
        message: `Error: ${error}`,
      });
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-bold text-slate-900">
          Authentication & Database Test
        </h1>

        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle>Clerk Authentication Status</CardTitle>
            <CardDescription>
              Check if user is logged in via Clerk
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              {isSignedIn ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-700">
                    User is signed in
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-700">
                    User is not signed in
                  </span>
                </>
              )}
            </div>

            {isSignedIn && user && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-2 font-semibold text-slate-900">
                  User Information:
                </h3>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>
                    <strong>User ID:</strong> {user.id}
                  </li>
                  <li>
                    <strong>Email:</strong>{" "}
                    {user.primaryEmailAddress?.emailAddress}
                  </li>
                  <li>
                    <strong>Name:</strong> {user.fullName || "Not set"}
                  </li>
                </ul>
              </div>
            )}

            {!isSignedIn && (
              <p className="text-sm text-slate-600">
                Please sign in using the UserButton in the top right corner to
                test the API.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Backend Tests */}
        {isSignedIn && (
          <Card>
            <CardHeader>
              <CardTitle>Backend & Database Tests</CardTitle>
              <CardDescription>
                Test your FastAPI backend and MongoDB connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={testBackendConnection}
                  disabled={apiStatus.status === "loading"}
                >
                  {apiStatus.status === "loading" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Test Backend Health
                </Button>

                <Button
                  onClick={testSaveData}
                  disabled={apiStatus.status === "loading"}
                  variant="outline"
                >
                  {apiStatus.status === "loading" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Test Save Data
                </Button>

                <Button
                  onClick={testGetHistory}
                  disabled={apiStatus.status === "loading"}
                  variant="outline"
                >
                  {apiStatus.status === "loading" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Test Get History
                </Button>
              </div>

              {apiStatus.status !== "idle" && (
                <div
                  className={`rounded-lg border p-4 ${
                    apiStatus.status === "success"
                      ? "border-green-200 bg-green-50"
                      : apiStatus.status === "error"
                        ? "border-red-200 bg-red-50"
                        : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {apiStatus.status === "success" && (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                    )}
                    {apiStatus.status === "error" && (
                      <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
                    )}
                    {apiStatus.status === "loading" && (
                      <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-blue-600" />
                    )}
                    <p
                      className={`text-sm ${
                        apiStatus.status === "success"
                          ? "text-green-800"
                          : apiStatus.status === "error"
                            ? "text-red-800"
                            : "text-blue-800"
                      }`}
                    >
                      {apiStatus.message}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>
                Make sure your backend is running:{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5">
                  python main.py
                </code>
              </li>
              <li>Sign in using Clerk (UserButton in top right)</li>
              <li>Click "Test Backend Health" to verify backend connection</li>
              <li>Click "Test Save Data" to save a test document to MongoDB</li>
              <li>Click "Test Get History" to fetch saved documents</li>
              <li>
                Check your MongoDB database to verify data is actually stored
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
