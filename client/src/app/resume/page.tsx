"use client";

import { useEffect, useState } from "react";
import api, { getProfilePerformance } from "@/lib/api";
import type { PerformanceHistory } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuth";

interface Analysis {
  atsScore: number;
  foundSkills: string[];
  missingSkills: string[];
  suggestions: string[];
}

type MessageKind = "error" | "success";

export default function ResumePage() {
  const { isAuthed } = useRequireAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<MessageKind>("success");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [aiFeedback, setAiFeedback] = useState("");
  const [history, setHistory] = useState<PerformanceHistory | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!isAuthed) return;

    (async () => {
      try {
        const data = await getProfilePerformance();
        if (mounted) setHistory(data);
      } catch {
        // Past analyses are optional; do not block the page.
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isAuthed]);

  const showMessage = (text: string, kind: MessageKind) => {
    setMessage(text);
    setMessageKind(kind);
  };

  const uploadResume = async () => {
    if (!file) {
      showMessage("Please select a resume first.", "error");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const formData = new FormData();
      formData.append("resume", file);

      const res = await api.post("/resume/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      showMessage(res.data.message, "success");
      setAnalysis(res.data.analysis);
      setAiFeedback(res.data.aiFeedback || "");

      const data = await getProfilePerformance();
      setHistory(data);
    } catch (err: unknown) {
      setAnalysis(null);
      setAiFeedback("");

      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;

      showMessage(errorMessage || "Resume upload failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthed) {
    return (
      <main className="app-shell">
        <div className="app-container">
          <p className="mt-8 text-gray-500">Loading resume analyzer...</p>
        </div>
      </main>
    );
  }

  const scoreColor =
    !analysis || analysis.atsScore >= 70
      ? "bg-green-500"
      : analysis.atsScore >= 55
      ? "bg-yellow-400"
      : "bg-red-500";

  return (
    <main className="app-shell">
      <div className="app-container">
        <h1 className="page-heading">AI Resume Analyzer</h1>
        <p className="page-subheading">
          Upload your resume for a rule-based ATS score plus AI-generated
          feedback.
        </p>

        <section className="card mt-8">
          <h2 className="text-2xl font-semibold text-slate-900">Upload Resume</h2>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <label className="flex-1">
              <span className="sr-only">Choose a resume file</span>
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setMessage("");
                }}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
              />
            </label>

            <button
              onClick={uploadResume}
              disabled={loading}
              className="btn-primary shrink-0"
            >
              {loading ? "Uploading..." : "Upload Resume"}
            </button>
          </div>

          {!file && !message && (
            <p className="mt-4 text-sm text-gray-500">
              Select a .pdf or .docx file to begin.
            </p>
          )}

          {message && (
            <p
              className={`mt-4 font-semibold ${
                messageKind === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
        </section>

        {analysis && (
          <section className="card mt-8">
            <h2 className="text-2xl font-bold text-blue-600">ATS Analysis</h2>

            <div className="mt-8">
              <p className="text-xl font-semibold text-slate-900">ATS Score</p>
              <div className="mt-2 h-5 w-full rounded-full bg-gray-200">
                <div
                  className={`h-5 rounded-full ${scoreColor}`}
                  style={{ width: `${analysis.atsScore}%` }}
                ></div>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {analysis.atsScore}/100
              </p>
            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="mb-4 text-lg font-bold text-green-600">
                  Skills Found
                </h3>
                {analysis.foundSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analysis.foundSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No skills detected.</p>
                )}
              </div>

              <div>
                <h3 className="mb-4 text-lg font-bold text-red-600">
                  Missing Skills
                </h3>
                {analysis.missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analysis.missingSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Nothing missing — nice.
                  </p>
                )}
              </div>
            </div>

            {analysis.suggestions.length > 0 && (
              <div className="mt-10">
                <h3 className="mb-4 text-lg font-bold text-slate-900">
                  Suggestions
                </h3>
                <ul className="list-disc space-y-2 pl-6 text-slate-700">
                  {analysis.suggestions.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {aiFeedback && (
              <div className="mt-10 rounded-xl border border-blue-100 bg-slate-50 p-6">
                <h3 className="mb-4 text-lg font-bold text-blue-600">
                  AI Feedback
                </h3>
                <p className="whitespace-pre-wrap leading-7 text-gray-700">
                  {aiFeedback}
                </p>
                <p className="mt-4 text-xs text-slate-400">
                  AI feedback is generated by an LLM and is advisory only.
                </p>
              </div>
            )}
          </section>
        )}

        {history && history.resumeAnalyses.length > 0 && (
          <section className="card mt-8">
            <h2 className="text-xl font-bold text-slate-900">
              Past Analyses
            </h2>
            <ul className="mt-4 space-y-3">
              {history.resumeAnalyses
                .slice(0, 5)
                .map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                  >
                    <span className="font-semibold text-slate-900">
                      {item.filename}
                    </span>
                    <span className="text-sm font-semibold text-blue-600">
                      {item.atsScore}%
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
