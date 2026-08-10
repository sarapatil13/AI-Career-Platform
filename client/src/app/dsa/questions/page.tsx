"use client";

import { questions } from "@/data/questions";
import {
  getDsaProgress,
  syncDsaProgress,
  updateDsaProgress,
} from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

const LOCAL_KEY = "completedQuestions";

const readLocal = (): number[] => {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(LOCAL_KEY);
    return saved ? (JSON.parse(saved) as number[]) : [];
  } catch {
    return [];
  }
};

const isLoggedIn = () =>
  typeof window !== "undefined" && Boolean(localStorage.getItem("token"));

export default function QuestionsPage() {
  const params =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search);

  const initialCompany = params?.get("company") || "all";
  const initialDifficulty = params?.get("difficulty") || "all";
  const initialTopic = params?.get("topic") || "all";

  const [company, setCompany] = useState(initialCompany);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [topic, setTopic] = useState(initialTopic);

  const [showHint, setShowHint] = useState<number | null>(null);
  const [showSolution, setShowSolution] = useState<number | null>(null);
  const [completedQuestions, setCompletedQuestions] = useState<number[]>([]);
  const [serverCompleted, setServerCompleted] = useState<Set<string>>(
    () => new Set()
  );
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);

      if (!isLoggedIn()) {
        setCompletedQuestions(readLocal());
        setLoading(false);
        return;
      }

      try {
        const profile = await getDsaProgress();
        if (!mounted) return;

        const serverIds = new Set(profile.completedQuestionIds);
        setServerCompleted(serverIds);
        setCompletedQuestions([
          ...new Set([
            ...readLocal(),
            ...profile.completedQuestionIds.map(Number),
          ]),
        ]);
      } catch {
        if (mounted) setError("Could not load your saved progress.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(completedQuestions));
    }
  }, [completedQuestions]);

  const unsyncedIds = useMemo(
    () =>
      completedQuestions.filter((id) => !serverCompleted.has(String(id))),
    [completedQuestions, serverCompleted]
  );

  const companies = useMemo(
    () => [...new Set(questions.map((question) => question.company))],
    []
  );
  const difficulties = useMemo(
    () => [...new Set(questions.map((question) => question.difficulty))],
    []
  );
  const topics = useMemo(
    () => [...new Set(questions.map((question) => question.topic))],
    []
  );

  const filteredQuestions = questions.filter((question) => {
    return (
      (company === "all" || question.company === company) &&
      (difficulty === "all" || question.difficulty === difficulty) &&
      (topic === "all" || question.topic === topic)
    );
  });

  const completedCount = completedQuestions.length;
  const totalQuestions = filteredQuestions.length;
  const progress =
    totalQuestions === 0
      ? 0
      : Math.round((completedCount / totalQuestions) * 100);

  const toggleComplete = (id: number) => {
    const completed = !completedQuestions.includes(id);
    const next = completed
      ? [...completedQuestions, id]
      : completedQuestions.filter((questionId) => questionId !== id);
    setCompletedQuestions(next);

    if (isLoggedIn()) {
      updateDsaProgress(id, completed).catch(() => {});
    }
  };

  const handleSync = async () => {
    if (isSyncing || unsyncedIds.length === 0) return;
    setIsSyncing(true);
    setError("");

    try {
      await syncDsaProgress(unsyncedIds);
      const profile = await getDsaProgress();
      setServerCompleted(new Set(profile.completedQuestionIds));
    } catch {
      setError("Could not sync. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const filterSelect = (
    label: string,
    value: string,
    options: string[],
    onChange: (value: string) => void
  ) => (
    <div>
      <label className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base mt-2"
      >
        <option value="all">All</option>
        {options.map((entry) => (
          <option key={entry} value={entry}>
            {entry}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <main className="app-shell">
      <div className="app-container">
        <h1 className="page-heading">DSA Questions</h1>
        <p className="page-subheading">
          Practice curated questions with hints, solutions, and external problem
          links.
        </p>

        {error && <div className="error-box">{error}</div>}

        <section className="card mt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Progress</h2>
              <p className="mt-1 text-sm text-gray-600">
                {completedCount} completed in the current filter ·{" "}
                {progress}% complete
              </p>
            </div>
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <div className="w-full sm:w-64">
                <div className="h-3 w-full rounded-full bg-slate-200">
                  <div
                    className="h-3 rounded-full bg-green-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </section>

        {isLoggedIn() && unsyncedIds.length > 0 && !loading && (
          <section className="mt-6 rounded-xl border border-blue-300 bg-blue-50 p-5">
            <h2 className="text-lg font-semibold text-blue-900">
              Sync local progress
            </h2>
            <p className="mt-1 text-blue-800">
              You have {unsyncedIds.length} completed question(s) saved in this
              browser that are not on your account yet. Sync them once to track
              them on the server.
            </p>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="btn-primary mt-3"
            >
              {isSyncing ? "Syncing..." : "Sync to account"}
            </button>
          </section>
        )}

        <section className="card mt-8">
          <h2 className="text-lg font-bold text-slate-900">Filters</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {filterSelect("Company", company, companies, setCompany)}
            {filterSelect("Difficulty", difficulty, difficulties, setDifficulty)}
            {filterSelect("Topic", topic, topics, setTopic)}
          </div>
        </section>

        <div className="mt-8 grid gap-6">
          {filteredQuestions.length === 0 && !loading && (
            <p className="text-gray-500">
              No questions match the current filters.
            </p>
          )}
          {filteredQuestions.map((question) => {
            const isCompleted = completedQuestions.includes(question.id);

            return (
              <article key={question.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold text-blue-600">
                    {question.title}
                  </h2>
                  <div className="flex gap-2">
                    <span className="pill">{question.company}</span>
                    <span className="pill">{question.difficulty}</span>
                    <span className="pill">{question.topic}</span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={question.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    Solve on LeetCode →
                  </a>

                  <button
                    onClick={() =>
                      setShowHint(showHint === question.id ? null : question.id)
                    }
                    className="rounded-xl bg-yellow-400 px-4 py-2 font-semibold text-yellow-900 transition hover:bg-yellow-500"
                  >
                    {showHint === question.id ? "Hide Hint" : "Hint"}
                  </button>

                  <button
                    onClick={() =>
                      setShowSolution(
                        showSolution === question.id ? null : question.id
                      )
                    }
                    className="rounded-xl bg-green-500 px-4 py-2 font-semibold text-white transition hover:bg-green-600"
                  >
                    {showSolution === question.id ? "Hide Solution" : "Solution"}
                  </button>

                  <button
                    onClick={() => toggleComplete(question.id)}
                    className={`rounded-xl px-4 py-2 font-semibold transition ${
                      isCompleted
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-slate-600 text-white hover:bg-slate-700"
                    }`}
                  >
                    {isCompleted ? "✓ Completed" : "Mark Complete"}
                  </button>
                </div>

                {showHint === question.id && (
                  <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-gray-900">
                    <strong>Hint:</strong> {question.hint}
                  </div>
                )}
                {showSolution === question.id && (
                  <div className="mt-4 rounded-lg border border-green-300 bg-green-50 p-4 text-gray-900">
                    <strong>Solution:</strong> {question.solution}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
