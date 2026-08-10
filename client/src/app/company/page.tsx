"use client";

import {
  analyzeCompanyPrep,
  getCompanyOptions,
  listCompanyAnalyses,
} from "@/lib/api";
import type {
  CompanyOption,
  CompanyPrepAnalysis,
} from "@/lib/api";
import { useEffect, useState } from "react";

export default function CompanyPage() {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [skillsInput, setSkillsInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<CompanyPrepAnalysis | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<CompanyPrepAnalysis[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [{ companies }, analyses] = await Promise.all([
          getCompanyOptions(),
          listCompanyAnalyses(),
        ]);
        if (!mounted) return;
        setCompanies(companies);
        setSavedAnalyses(analyses.analyses);
      } catch {
        if (mounted) setError("Could not load company options. Please log in.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const company =
    companies.find((entry) => entry.name === selectedCompany) || null;

  const selectCompany = (name: string) => {
    const next = companies.find((entry) => entry.name === name) || null;
    setSelectedCompany(name);
    setSelectedRole("");
    setAnalysis(null);
    setError("");
    if (next) setSkillsInput(next.roles[0]?.requiredSkills.join(", ") || "");
  };

  const role =
    company?.roles.find((entry) => entry.role === selectedRole) || null;

  const addSkillChip = (skill: string) => {
    const skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!skills.includes(skill)) {
      skills.push(skill);
      setSkillsInput(skills.join(", "));
    }
  };

  const handleAnalyze = async () => {
    if (!company || !role || isAnalyzing) return;
    setIsAnalyzing(true);
    setError("");

    const skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const result = await analyzeCompanyPrep({
        company: company.name,
        role: role.role,
        skills: skills.length > 0 ? skills : undefined,
      });
      setAnalysis(result);
      const analyses = await listCompanyAnalyses();
      setSavedAnalyses(analyses.analyses);
    } catch {
      setError("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

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
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-600">
          Company Preparation
        </h1>
        <p className="text-gray-600 mt-2">
          Pick a company and role to see your match and preparation priorities.
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <p className="mt-8 text-gray-500">Loading company catalog...</p>
        ) : (
          <>
            <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {companies.map((entry) => (
                <button
                  key={entry.name}
                  onClick={() => selectCompany(entry.name)}
                  className={`rounded-2xl border p-6 text-left transition ${
                    selectedCompany === entry.name
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-slate-900">
                      {entry.name}
                    </span>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-200 text-slate-700">
                      {entry.roles.length} role{entry.roles.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {entry.roles.map((r) => (
                      <span
                        key={r.role}
                        className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700"
                      >
                        {r.role}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </section>

            {company && (
              <section className="mt-8 rounded-2xl bg-white p-8 shadow">
                <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
                  {company.name}
                </p>
                <h2 className="text-2xl font-bold text-slate-900 mt-2">
                  Choose a role
                </h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {company.roles.map((r) => (
                    <button
                      key={r.role}
                      onClick={() => {
                        setSelectedRole(r.role);
                        setAnalysis(null);
                        setError("");
                      }}
                      className={`rounded-xl border px-5 py-2 font-semibold transition ${
                        selectedRole === r.role
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {r.role}
                    </button>
                  ))}
                </div>

                {role && (
                  <div className="mt-6">
                    <h3 className="font-bold text-slate-900">Your skills</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Edit the comma-separated list, or click suggested skills.
                    </p>
                    <textarea
                      value={skillsInput}
                      onChange={(e) => setSkillsInput(e.target.value)}
                      rows={2}
                      className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-slate-900 focus:border-blue-500 focus:outline-none"
                      placeholder="Python, Java, SQL, ..."
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {role.requiredSkills.map((skill) => (
                        <button
                          key={skill}
                          onClick={() => addSkillChip(skill)}
                          className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-200"
                        >
                          + {skill}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="mt-6 rounded-xl bg-blue-600 px-8 py-3 text-white font-semibold shadow hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isAnalyzing ? "Analyzing..." : "Analyze My Prep"}
                    </button>
                  </div>
                )}
              </section>
            )}

            {analysis && (
              <section className="mt-8 rounded-2xl bg-white p-8 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
                      {analysis.company}
                    </p>
                    <h2 className="text-3xl font-bold text-slate-900 mt-2">
                      {analysis.role}
                    </h2>
                  </div>
                  <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                    {analysis.overallMatchScore}% Overall Match
                  </span>
                </div>

                {analysis.strategy && (
                  <div className="mt-6 rounded-xl bg-slate-100 p-5">
                    <h3 className="font-bold text-slate-900">Strategy</h3>
                    <p className="mt-2 text-slate-700">{analysis.strategy}</p>
                  </div>
                )}

                <div className="mt-8 space-y-4">
                  {scoreBar("Overall Match", analysis.overallMatchScore, "bg-blue-600")}
                  {scoreBar("Technical Skills", analysis.technicalSkillsScore, "bg-blue-500")}
                  {scoreBar("DSA Readiness", analysis.dsaReadinessScore, "bg-green-500")}
                  {scoreBar("Core CS", analysis.coreCSScore, "bg-purple-500")}
                </div>

                <div className="mt-8 grid md:grid-cols-2 gap-6">
                  <div className="rounded-xl bg-slate-100 p-6">
                    <h3 className="font-bold text-lg text-slate-900">
                      Strengths
                    </h3>
                    <ul className="mt-4 space-y-3 text-slate-700">
                      {analysis.strengths.map((strength) => (
                        <li key={strength}>• {strength}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-slate-100 p-6">
                    <h3 className="font-bold text-lg text-slate-900">
                      Priority Gaps
                    </h3>
                    <ul className="mt-4 space-y-3 text-slate-700">
                      {analysis.highPriorityGaps.map((gap) => (
                        <li key={gap}>• {gap}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {analysis.focusTopics.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-bold text-slate-900">Focus Topics</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {analysis.focusTopics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.resources.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-bold text-slate-900">
                      Recommended Resources
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {analysis.resources.map((resource) => (
                        <li key={`${resource.title}-${resource.url}`}>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            {resource.title}
                          </a>
                          <span className="ml-2 text-sm text-gray-600">
                            {resource.difficulty}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {savedAnalyses.length > 0 && (
              <section className="mt-8 rounded-2xl bg-white p-8 shadow">
                <h2 className="text-xl font-bold text-slate-900">
                  Saved Analyses
                </h2>
                <div className="mt-4 space-y-3">
                  {savedAnalyses.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setAnalysis(item)}
                      className="w-full rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {item.company} — {item.role}
                        </span>
                        <span className="text-sm font-semibold text-blue-600">
                          {item.overallMatchScore}%
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                        {item.source === "gemini" ? " · AI-powered" : ""}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
