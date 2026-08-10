"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProfileSummary } from "@/lib/api";
import type { ProfileSummary } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuth";

const TOOLS = [
  { href: "/resume", title: "Resume Analysis", description: "ATS score + AI feedback." },
  { href: "/dsa", title: "DSA Practice", description: "Readiness, topics and practice links." },
  { href: "/company", title: "Company Prep", description: "Match analysis per company and role." },
  { href: "/mock-interview", title: "Mock Interview", description: "Technical and HR interview practice." },
  { href: "/career", title: "Career Guidance", description: "Role fit and skill roadmap." },
  { href: "/profile", title: "Profile", description: "Streaks, scores, weak topics and next actions." },
];

export default function Dashboard() {
  const { isAuthed } = useRequireAuth();
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    if (!isAuthed) return;

    (async () => {
      try {
        const data = await getProfileSummary();
        if (mounted) setSummary(data);
      } catch {
        if (mounted) setError("Could not load your progress. Please log in.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isAuthed]);

  if (!isAuthed) {
    return (
      <main className="app-shell">
        <div className="app-container">
          <p className="mt-8 text-gray-500">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  const scores = summary?.latestScores;
  const hasData = Boolean(summary?.hasData);

  return (
    <main className="app-shell">
      <div className="app-container">
        <h1 className="page-heading">AI Career Dashboard</h1>
        <p className="page-subheading">
          Welcome back! Here is where you stand today.
        </p>

        {error && <div className="error-box">{error}</div>}

        {summary && (
          <>
            <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
              <div className="card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Streak</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {summary.streak.current}
                  <span className="text-sm font-medium text-slate-400"> days</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Longest: {summary.streak.longest}
                </p>
              </div>

              <div className="card">
                <p className="text-xs uppercase tracking-wide text-slate-500">DSA Readiness</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {scores?.dsaReadiness ? `${scores.dsaReadiness.score}%` : "—"}
                </p>
              </div>

              <div className="card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Resume ATS</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {scores?.resume ? `${scores.resume.score}%` : "—"}
                </p>
              </div>

              <div className="card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Mock Interview</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {scores?.mockInterview ? `${scores.mockInterview.score ?? "—"}%` : "—"}
                </p>
              </div>

              <div className="card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Company Prep</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {scores?.companyPrep ? `${scores.companyPrep.score}%` : "—"}
                </p>
              </div>
            </section>

            {!hasData && (
              <div className="card mt-8">
                <h2 className="text-lg font-bold text-slate-900">
                  Get started
                </h2>
                <p className="mt-2 text-gray-600">
                  Your dashboard is empty. Analyze your resume, solve a DSA
                  question, run a company analysis, or complete a mock interview
                  to start building your progress.
                </p>
              </div>
            )}

            {summary.recommendedActions.length > 0 && (
              <section className="card mt-8">
                <h2 className="text-xl font-bold text-slate-900">Recommended next</h2>
                <ul className="mt-4 space-y-3">
                  {summary.recommendedActions.map((action) => (
                    <li key={`${action.action}-${action.priority}`} className="flex items-start gap-3">
                      <span className={`pill ${action.priority === "high" ? "bg-red-100 text-red-700" : ""}`}>
                        {action.priority}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{action.action}</p>
                        <p className="text-sm text-gray-600">{action.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {summary.recentActivity.length > 0 && (
              <section className="card mt-8">
                <h2 className="text-xl font-bold text-slate-900">Recent activity</h2>
                <ul className="mt-4 space-y-2">
                  {summary.recentActivity.slice(0, 5).map((event) => (
                    <li key={event.id} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-700">{event.summary}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(event.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <Link key={tool.href} href={tool.href} className="card transition hover:shadow-xl">
              <h2 className="text-xl font-bold text-blue-600">{tool.title}</h2>
              <p className="mt-3 text-gray-600">{tool.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
