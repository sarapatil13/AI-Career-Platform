"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";

interface Analysis {
  atsScore: number;
  foundSkills: string[];
  missingSkills: string[];
  suggestions: string[];
}

export default function ResumePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string>("");

  const uploadResume = async () => {
    if (!file) {
      setMessage("Please select a resume first.");
      return;
    }

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("Please log in before uploading a resume.");
        router.push("/login");
        return;
      }
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("resume", file);

      const res = await api.post("/resume/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage(res.data.message);
      setAnalysis(res.data.analysis);
      setAiFeedback(res.data.aiFeedback || "");
    } catch (err: unknown) {
      setAnalysis(null);
      setAiFeedback("");

      const errorMessage = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;

      setMessage(errorMessage || "Resume upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-5xl mx-auto">

        <h1 className="text-4xl font-bold text-blue-600">
          AI Resume Analyzer
        </h1>

        <p className="text-gray-600 mt-2">
          Upload your resume and receive AI-powered ATS analysis.
        </p>

        {/* Upload Card */}

        <div className="bg-white rounded-xl shadow-lg p-8 mt-8">

          <h2 className="text-2xl font-semibold mb-6">
            Upload Resume
          </h2>

          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) =>
              setFile(e.target.files?.[0] || null)
            }
            className="mb-6"
          />

          <br />

          <button
            onClick={uploadResume}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            {loading ? "Uploading..." : "Upload Resume"}
          </button>

          {message && (
            <p className="mt-5 font-semibold text-green-600">
              {message}
            </p>
          )}

        </div>

        {/* ATS Results */}

        {analysis && (
          <div className="bg-white rounded-xl shadow-lg mt-8 p-8">

            <h2 className="text-3xl font-bold text-blue-600">
              ATS Analysis
            </h2>

            {/* Score */}

            <div className="mt-8">

              <p className="text-xl font-semibold">
                ATS Score
              </p>

              <div className="w-full bg-gray-200 rounded-full h-5 mt-2">

                <div
                  className="bg-green-500 h-5 rounded-full"
                  style={{
                    width: `${analysis.atsScore}%`,
                  }}
                ></div>

              </div>

              <p className="mt-2 text-2xl font-bold">
                {analysis.atsScore}/100
              </p>

            </div>

            {/* Skills */}

            <div className="grid md:grid-cols-2 gap-8 mt-10">

              <div>

                <h3 className="text-xl font-bold text-green-600 mb-4">
                  Skills Found
                </h3>

                <div className="flex flex-wrap gap-2">

                  {analysis.foundSkills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-green-100 text-green-700 px-3 py-1 rounded-full"
                    >
                      {skill}
                    </span>
                  ))}

                </div>

              </div>

              <div>

                <h3 className="text-xl font-bold text-red-600 mb-4">
                  Missing Skills
                </h3>

                <div className="flex flex-wrap gap-2">

                  {analysis.missingSkills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-red-100 text-red-700 px-3 py-1 rounded-full"
                    >
                      {skill}
                    </span>
                  ))}

                </div>

              </div>

            </div>

            {/* Suggestions */}

            <div className="mt-10">

              <h3 className="text-xl font-bold mb-4">
                Suggestions
              </h3>

              <ul className="list-disc pl-6 space-y-2">

                {analysis.suggestions.map((item, index) => (
                  <li key={index}>
                    {item}
                  </li>
                ))}

              </ul>

            </div>

            {aiFeedback && (
              <div className="mt-10 border rounded-xl p-6 bg-slate-50">
                <h3 className="text-xl font-bold mb-4 text-blue-600">
                  AI Feedback
                </h3>
                <p className="whitespace-pre-wrap leading-7 text-gray-700">
                  {aiFeedback}
                </p>
              </div>
            )}

          </div>
        )}

      </div>
    </main>
  );
}