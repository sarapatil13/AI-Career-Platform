"use client";

import {
  addInterestedCompany,
  addTargetRole,
  getCompanyOptions,
  getProfilePerformance,
  getProfileSummary,
  removeInterestedCompany,
  removeTargetRole,
  updateProfile,
} from "@/lib/api";
import type {
  CompanyOption,
  PerformanceHistory,
  ProfileSummary,
} from "@/lib/api";
import { useEffect, useState } from "react";

const priorityColor = (priority: string) => {
  if (priority === "High") return "bg-red-100 text-red-700";
  if (priority === "Medium") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
};

const scoreColor = (score: number) => {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function ProfilePage() {
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [performance, setPerformance] = useState<PerformanceHistory | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");

  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [newRole, setNewRole] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    const [summaryResult, performanceResult, optionsResult] = await Promise.all([
      getProfileSummary(),
      getProfilePerformance(),
      getCompanyOptions(),
    ]);
    setSummary(summaryResult);
    setPerformance(performanceResult);
    setCompanies(optionsResult.companies);
    setSkillsInput(summaryResult.user.skills.join(", "));
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await loadData();
        if (!mounted) return;
      } catch {
        if (mounted) setError("Could not load your profile. Please log in.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const runMutation = async (fn: () => Promise<unknown>) => {
    setIsWorking(true);
    setMessage("");
    setError("");
    try {
      await fn();
      await loadData();
      setMessage("Updated.");
    } catch (e) {
      const detail =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Request failed";
      setError(detail);
    } finally {
      setIsWorking(false);
    }
  };

  const handleAddCompany = () => {
    if (!selectedCompany) return;
    void runMutation(() =>
      addInterestedCompany({
        company: selectedCompany,
        role: selectedRole || undefined,
      })
    );
  };

  const handleAddRole = () => {
    if (!newRole.trim()) return;
    void runMutation(() => addTargetRole(newRole.trim()));
  };

  const handleSaveSkills = () => {
    void runMutation(() =>
      updateProfile({
        skills: skillsInput
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
      })
    );
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-5xl mx-auto text-center py-20 text-gray-500">
          Loading your dashboard...
        </div>
      </main>
    );
  }

  if (error && !summary) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-5xl mx-auto rounded-2xl bg-white shadow-lg p-8 text-center text-red-600">
          {error}
        </div>
      </main>
    );
  }

  if (!summary) return null;

  const roleCatalog = companies.flatMap((entry) => entry.roles.map((r) => r.role));
  const availableRoles = [...new Set(roleCatalog)];
  const companyCatalogRoles =
    companies.find((entry) => entry.name === selectedCompany)?.roles || [];
  const latest = summary.latestScores;

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {message && (
          <div className="rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl bg-white shadow-lg p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-blue-600">
                {summary.user.name}
              </h1>
              <p className="text-gray-600 mt-1">{summary.user.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                Current streak: {summary.streak.current} day
                {summary.streak.current === 1 ? "" : "s"}
              </span>
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                Longest: {summary.streak.longest}
              </span>
            </div>
          </div>
        </div>

        {!summary.hasData && (
          <div className="rounded-2xl bg-white shadow-lg p-8 text-center">
            <p className="text-lg font-semibold text-gray-700">
              No career data yet
            </p>
            <p className="text-gray-500 mt-2">
              Analyze your resume, solve DSA questions, or complete a mock
              interview and your progress will show up here.
            </p>
          </div>
        )}

        <section className="rounded-2xl bg-white shadow-lg p-8">
          <h2 className="text-2xl font-bold text-slate-900">Readiness scores</h2>
          <div className="mt-5 grid md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-slate-100 p-5">
              <p className="text-sm font-bold uppercase text-slate-500">
                Resume / ATS
              </p>
              {latest.resume ? (
                <p
                  className={`mt-2 text-3xl font-bold ${scoreColor(
                    latest.resume.score
                  )}`}
                >
                  {latest.resume.score}
                  <span className="text-base text-slate-400">/100</span>
                </p>
              ) : (
                <p className="mt-2 text-3xl font-bold text-slate-300">--</p>
              )}
              {latest.resume && (
                <p className="text-xs text-slate-500 mt-1">
                  {formatDate(latest.resume.analyzedAt)}
                </p>
              )}
            </div>

            <div className="rounded-xl bg-slate-100 p-5">
              <p className="text-sm font-bold uppercase text-slate-500">
                DSA readiness
              </p>
              {latest.dsaReadiness && latest.dsaReadiness.score > 0 ? (
                <p
                  className={`mt-2 text-3xl font-bold ${scoreColor(
                    latest.dsaReadiness.score
                  )}`}
                >
                  {latest.dsaReadiness.score}
                  <span className="text-base text-slate-400">/100</span>
                </p>
              ) : (
                <p className="mt-2 text-3xl font-bold text-slate-300">--</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {summary.counts.dsaCompleted} questions solved
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-5">
              <p className="text-sm font-bold uppercase text-slate-500">
                Company prep
              </p>
              {latest.companyPrep ? (
                <>
                  <p
                    className={`mt-2 text-3xl font-bold ${scoreColor(
                      latest.companyPrep.score
                    )}`}
                  >
                    {latest.companyPrep.score}
                    <span className="text-base text-slate-400">/100</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {latest.companyPrep.company} · {latest.companyPrep.role}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-3xl font-bold text-slate-300">--</p>
              )}
            </div>

            <div className="rounded-xl bg-slate-100 p-5">
              <p className="text-sm font-bold uppercase text-slate-500">
                Mock interview
              </p>
              {latest.mockInterview ? (
                <>
                  <p
                    className={`mt-2 text-3xl font-bold ${
                      latest.mockInterview.score === null
                        ? "text-slate-300"
                        : scoreColor(latest.mockInterview.score)
                    }`}
                  >
                    {latest.mockInterview.score === null
                      ? "--"
                      : latest.mockInterview.score}
                    {latest.mockInterview.score !== null && (
                      <span className="text-base text-slate-400">/100</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {latest.mockInterview.interviewType} ·{" "}
                    {formatDate(latest.mockInterview.completedAt)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-3xl font-bold text-slate-300">--</p>
              )}
            </div>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="rounded-2xl bg-white shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900">
              Recommended next actions
            </h2>
            <ul className="mt-4 space-y-3">
              {summary.recommendedActions.map((action) => (
                <li key={action.action} className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-800">{action.action}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${priorityColor(
                        action.priority
                      )}`}
                    >
                      {action.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{action.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-white shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900">Weak topics</h2>
            {summary.weakTopics.length === 0 ? (
              <p className="text-gray-500 mt-4 text-sm">
                No weak topics with supporting evidence yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {summary.weakTopics.map((topic) => (
                  <li key={topic.topic} className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-slate-800">{topic.topic}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${priorityColor(
                          topic.priority
                        )}`}
                      >
                        {topic.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Evidence: {topic.sources.join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-2xl bg-white shadow-lg p-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Interested companies
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {summary.interestedCompanies.map((entry) => (
              <span
                key={entry.company}
                className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700"
              >
                {entry.company}
                {entry.roles.length > 0 && (
                  <span className="text-xs font-semibold text-blue-500">
                    {entry.roles.join(", ")}
                  </span>
                )}
                <button
                  className="ml-1 text-blue-500 hover:text-blue-800 disabled:opacity-50"
                  disabled={isWorking}
                  onClick={() =>
                    void runMutation(() =>
                      removeInterestedCompany(entry.company)
                    )
                  }
                >
                  ×
                </button>
              </span>
            ))}
            {summary.interestedCompanies.length === 0 && (
              <p className="text-gray-500 text-sm">
                No companies added yet.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-sm font-semibold text-slate-600">
              Company
              <select
                value={selectedCompany}
                onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  setSelectedRole("");
                }}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Select a company</option>
                {companies.map((entry) => (
                  <option key={entry.name} value={entry.name}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedCompany && (
              <label className="flex flex-col text-sm font-semibold text-slate-600">
                Role (optional)
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">Any role</option>
                  {companyCatalogRoles.map((entry) => (
                    <option key={entry.role} value={entry.role}>
                      {entry.role}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={!selectedCompany || isWorking}
              onClick={handleAddCompany}
            >
              Add company
            </button>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="rounded-2xl bg-white shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900">Target roles</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {summary.user.targetRoles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-700"
                >
                  {role}
                  <button
                    className="text-indigo-500 hover:text-indigo-800 disabled:opacity-50"
                    disabled={isWorking}
                    onClick={() => void runMutation(() => removeTargetRole(role))}
                  >
                    ×
                  </button>
                </span>
              ))}
              {summary.user.targetRoles.length === 0 && (
                <p className="text-gray-500 text-sm">No target roles yet.</p>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Add a target role"
                list="target-roles"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              />
              <datalist id="target-roles">
                {availableRoles.map((role) => (
                  <option key={role} value={role} />
                ))}
              </datalist>
              <button
                className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                disabled={!newRole.trim() || isWorking}
                onClick={handleAddRole}
              >
                Add role
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900">Skills</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {summary.user.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-teal-100 px-4 py-2 text-sm font-bold text-teal-700"
                >
                  {skill}
                </span>
              ))}
              {summary.user.skills.length === 0 && (
                <p className="text-gray-500 text-sm">
                  No skills saved yet.
                </p>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="Comma-separated skills"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              />
              <button
                className="rounded-lg bg-teal-600 px-4 py-2 font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                disabled={isWorking}
                onClick={handleSaveSkills}
              >
                Save skills
              </button>
            </div>
          </section>
        </div>

        <section className="rounded-2xl bg-white shadow-lg p-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Performance history
          </h2>
          {performance &&
            (performance.mockInterviews.length > 0 ||
              performance.companyPrep.length > 0 ||
              performance.resumeAnalyses.length > 0) ? (
              <div className="mt-5 grid md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-bold uppercase text-slate-500">
                    Mock interviews
                  </p>
                  <ul className="mt-3 space-y-2">
                    {performance.mockInterviews.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-xl bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="font-bold text-slate-800">
                          {entry.overallScore === null
                            ? "No score"
                            : `${entry.overallScore}/100`}
                        </span>
                        <span className="text-slate-500">
                          {" "}
                          · {entry.interviewType} · {entry.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase text-slate-500">
                    Company prep
                  </p>
                  <ul className="mt-3 space-y-2">
                    {performance.companyPrep.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-xl bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="font-bold text-slate-800">
                          {entry.overallMatchScore}/100
                        </span>
                        <span className="text-slate-500">
                          {" "}
                          · {entry.company} · {entry.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase text-slate-500">
                    Resume / ATS
                  </p>
                  <ul className="mt-3 space-y-2">
                    {performance.resumeAnalyses.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-xl bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="font-bold text-slate-800">
                          {entry.atsScore}/100
                        </span>
                        <span className="text-slate-500">
                          {" "}
                          · {formatDate(entry.date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 mt-4 text-sm">
                No performance history yet.
              </p>
            )}
        </section>

        <section className="rounded-2xl bg-white shadow-lg p-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Recent activity
          </h2>
          {summary.recentActivity.length === 0 ? (
            <p className="text-gray-500 mt-4 text-sm">
              No activity yet. Completing a DSA question, mock interview, company
              analysis, or resume analysis will appear here.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {summary.recentActivity.map((event) => (
                <li key={event.id} className="flex items-center justify-between py-3">
                  <p className="text-sm font-semibold text-slate-800">
                    {event.summary || event.type}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(event.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
