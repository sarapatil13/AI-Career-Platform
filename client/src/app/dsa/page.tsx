"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getDsaProgress } from "@/lib/api";
import type { DsaProfile } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuth";

type TierFilter = "all" | "required" | "preferred";

export default function DSAPage() {
  const { isAuthed } = useRequireAuth();
  const [profile, setProfile] = useState<DsaProfile | null>(null);
  const [error, setError] = useState("");
  const [tier, setTier] = useState<TierFilter>("all");
  const [topic, setTopic] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  useEffect(() => {
    let mounted = true;

    if (!isAuthed) return;

    (async () => {
      try {
        const data = await getDsaProgress();
        if (mounted) setProfile(data);
      } catch {
        if (mounted) setError("Could not load your DSA progress. Please log in.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isAuthed]);

  const topics = useMemo(() => {
    const entries = profile?.byTopic ?? [];

    return entries.filter((entry) => {
      if (tier !== "all" && (tier === "required") !== entry.required) return false;
      if (topic !== "all" && entry.topic !== topic) return false;
      if (difficulty !== "all" && entry.expectedDifficulty !== difficulty) return false;
      return true;
    });
  }, [profile, tier, topic, difficulty]);

  const topicNames = useMemo(
    () => (profile?.byTopic ?? []).map((entry) => entry.topic),
    [profile]
  );

  const difficultyOptions = useMemo(() => {
    const values = new Set(
      (profile?.byTopic ?? []).map((entry) => entry.expectedDifficulty)
    );
    return [...values];
  }, [profile]);

  if (!isAuthed) {
    return (
      <main className="app-shell">
        <div className="app-container">
          <p className="mt-8 text-gray-500">Loading DSA progress...</p>
        </div>
      </main>
    );
  }

  const filterButton = (
    label: string,
    active: boolean,
    onClick: () => void
  ) => (
    <button
      key={label}
      onClick={onClick}
      className={`rounded-xl border px-5 py-2 font-semibold transition ${
        active
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );

  const scoreBar = (label: string, score: number, color: string) => (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">{score}%</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-slate-200">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <main className="app-shell">
      <div className="app-container">
        <h1 className="page-heading">DSA Practice</h1>
        <p className="page-subheading">
          Track your readiness across required and preferred topics and practice
          with real problem links.
        </p>

        {error && <div className="error-box">{error}</div>}

        {profile && (
          <>
            <section className="card mt-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Readiness Overview
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {profile.totals.completed} questions completed ·{" "}
                    {profile.totals.topicsCovered} of{" "}
                    {profile.totals.requiredTopics + profile.totals.preferredTopics}{" "}
                    topics started
                  </p>
                </div>
                <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                  {profile.readinessScore}% Readiness
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {scoreBar(
                  "Required coverage",
                  Math.round(
                    (profile.totals.requiredCovered / profile.totals.requiredTopics) *
                      100
                  ),
                  "bg-blue-500"
                )}
                {scoreBar(
                  "Preferred coverage",
                  Math.round(
                    (profile.totals.preferredCovered /
                      profile.totals.preferredTopics) *
                      100
                  ),
                  "bg-purple-500"
                )}
              </div>
            </section>

            {profile.uncoveredRequiredTopics.length > 0 && (
              <section className="card mt-8">
                <h2 className="text-lg font-bold text-red-800">
                  Required topics not started
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.uncoveredRequiredTopics.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="card mt-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-slate-900">Topics</h2>
                <div className="flex flex-wrap gap-3">
                  {(["all", "required", "preferred"] as TierFilter[]).map((t) =>
                    filterButton(
                      t.charAt(0).toUpperCase() + t.slice(1),
                      tier === t,
                      () => setTier(t)
                    )
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Topic
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="input-base mt-2"
                  >
                    <option value="all">All topics</option>
                    {topicNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Expected difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="input-base mt-2"
                  >
                    <option value="all">Any difficulty</option>
                    {difficultyOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {topics.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No topics match the current filters.
                  </p>
                )}
                {topics.map((entry) => (
                  <div
                    key={entry.topic}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {entry.topic}
                        </span>
                        <span
                          className={`pill ${
                            entry.required
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {entry.required ? "Required" : "Preferred"}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {entry.priority} priority · {entry.expectedDifficulty}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        {entry.completed}/{entry.recommendedQuestions}
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                      <div
                        className={`h-2 rounded-full ${
                          entry.covered ? "bg-green-500" : "bg-slate-400"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (entry.completed / entry.recommendedQuestions) * 100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {profile.recommendedPractice.length > 0 && (
              <section className="card mt-8">
                <h2 className="text-xl font-bold text-slate-900">
                  Recommended practice
                </h2>
                <ul className="mt-4 space-y-3">
                  {profile.recommendedPractice.map((item) => (
                    <li
                      key={item.topic}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {item.topic}{" "}
                          <span className="text-sm font-medium text-slate-500">
                            · {item.reason}
                          </span>
                        </p>
                        {item.question && (
                          <a
                            href={item.question.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-sm font-semibold text-blue-600 hover:underline"
                          >
                            {item.question.title} ({item.question.difficulty}) →
                          </a>
                        )}
                      </div>
                      <span className="pill">{item.priority}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/dsa/questions">
                <button className="btn-primary">Open Question List</button>
              </Link>
              <Link href="/profile">
                <button className="btn-secondary">View in Profile</button>
              </Link>
            </div>
          </>
        )}

        {!profile && !error && (
          <section className="card mt-8">
            <h2 className="text-lg font-bold text-slate-900">No data yet</h2>
            <p className="mt-2 text-gray-600">
              Complete a DSA question to start building your readiness profile.
            </p>
            <Link href="/dsa/questions">
              <button className="btn-primary mt-4">Start Practicing</button>
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
