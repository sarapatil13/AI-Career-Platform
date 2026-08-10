"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuth";

interface InterviewResult {
  interviewPreparation: string;
  retrievalContext: string[];
  selectedChunks: string[];
}

export default function InterviewPage() {
  const { isAuthed } = useRequireAuth();

  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [company, setCompany] = useState("");
  const [technology, setTechnology] = useState("");
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");
  const [result, setResult] = useState<InterviewResult | null>(null);

  const prepare = async () => {
    if (isAuthed === false) return;

    try {
      setLoading(true);
      setResult(null);
      setMessage("");

      const res = await api.post("/interview/prepare", {
        resumeText,
        targetRole,
        company,
        technology,
        query,
      });

      setMessageKind("success");
      setMessage(res.data.message);
      setResult({
        interviewPreparation: res.data.interviewPreparation,
        retrievalContext: res.data.retrievalContext || [],
        selectedChunks: res.data.selectedChunks || [],
      });
    } catch (err: unknown) {
      setResult(null);

      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;

      setMessageKind("error");
      setMessage(errorMessage || "Interview preparation failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthed) {
    return (
      <main className="app-shell">
        <div className="app-container">
          <p className="mt-8 text-gray-500">Loading interview preparation...</p>
        </div>
      </main>
    );
  }

  const field = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    textarea = false
  ) => (
    <div>
      <label className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          placeholder={placeholder}
          className="input-base mt-2"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-base mt-2"
        />
      )}
    </div>
  );

  return (
    <main className="app-shell">
      <div className="app-container">
        <h1 className="page-heading">AI Interview Preparation</h1>
        <p className="page-subheading">
          Generate a student-level interview plan based on your resume, target
          role, and company focus.
        </p>

        <section className="card mt-8">
          {field(
            "Resume Text",
            resumeText,
            setResumeText,
            "Paste your resume text here...",
            true
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {field("Target Role", targetRole, setTargetRole, "e.g. Software Engineer")}
            {field("Company Focus", company, setCompany, "e.g. Infosys")}
            {field("Technology Focus", technology, setTechnology, "e.g. React")}
            {field("Question / Focus", query, setQuery, "e.g. Prepare me for the technical interview")}
          </div>

          <button
            onClick={prepare}
            disabled={loading}
            className="btn-primary mt-6"
          >
            {loading ? "Generating..." : "Generate Interview Plan"}
          </button>

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

        {result && (
          <section className="card mt-8">
            <h2 className="mb-4 text-2xl font-bold text-blue-600">
              Interview Preparation Plan
            </h2>

            <p className="whitespace-pre-wrap leading-7 text-gray-700">
              {result.interviewPreparation}
            </p>

            {result.retrievalContext.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 text-lg font-bold text-slate-900">
                  Retrieval Context Used
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.retrievalContext.map((chunk) => (
                    <span
                      key={chunk}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                    >
                      {chunk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
