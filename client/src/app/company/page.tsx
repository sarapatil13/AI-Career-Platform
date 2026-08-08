"use client";

import { useState } from "react";

const companyProfiles = [
  {
    name: "Infosys",
    role: "System Engineer / Associate Developer",
    focus: ["DSA", "Communication", "Logical reasoning"],
    topics: ["Arrays", "Strings", "DBMS basics"],
  },
  {
    name: "Lam Research",
    role: "Software Engineer Intern",
    focus: ["Problem solving", "Projects", "Core CS"],
    topics: ["Graphs", "OS", "OOP"],
  },
  {
    name: "Amazon",
    role: "SDE / Cloud Support",
    focus: ["Leadership", "Design", "Coding"],
    topics: ["Trees", "SQL", "API design"],
  },
];

export default function CompanyPage() {
  const [selectedCompany, setSelectedCompany] = useState(companyProfiles[0].name);

  const profile = companyProfiles.find((company) => company.name === selectedCompany) || companyProfiles[0];

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-600">Company Preparation</h1>
            <p className="text-gray-600 mt-2">Track role expectations and preparation priorities.</p>
          </div>
          <button className="rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold shadow hover:bg-blue-700">
            Build Plan
          </button>
        </div>

        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {companyProfiles.map((company) => (
            <button
              key={company.name}
              onClick={() => setSelectedCompany(company.name)}
              className={`rounded-2xl border p-6 text-left transition ${
                selectedCompany === company.name
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200 bg-white hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-slate-900">{company.name}</span>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-200 text-slate-700">
                  {company.role}
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {company.focus.map((focus) => (
                  <span key={focus} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                    {focus}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </section>

        <section className="mt-8 rounded-2xl bg-white p-8 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-600">{profile.name}</p>
              <h2 className="text-3xl font-bold text-slate-900 mt-2">{profile.role}</h2>
            </div>
            <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
              Preparation Mode
            </span>
          </div>
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="rounded-xl bg-slate-100 p-6">
              <h3 className="font-bold text-lg text-slate-900">Focus Areas</h3>
              <ul className="mt-4 space-y-3 text-slate-700">
                {profile.focus.map((focus) => (
                  <li key={focus}>• {focus}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-slate-100 p-6">
              <h3 className="font-bold text-lg text-slate-900">Revision Topics</h3>
              <ul className="mt-4 space-y-3 text-slate-700">
                {profile.topics.map((topic) => (
                  <li key={topic}>• {topic}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}