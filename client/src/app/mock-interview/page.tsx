"use client";

import { useState } from "react";

const mockRounds = [
  {
    id: 1,
    company: "Infosys",
    round: "HR Screening",
    focus: "Tell me about yourself",
    duration: "10 min",
    status: "Ready",
  },
  {
    id: 2,
    company: "Microsoft",
    round: "Technical Deep Dive",
    focus: "React + API integration",
    duration: "25 min",
    status: "Ready",
  },
  {
    id: 3,
    company: "Amazon",
    round: "Leadership Round",
    focus: "Problem-solving and ownership",
    duration: "15 min",
    status: "Draft",
  },
];

export default function MockInterviewPage() {
  const [selectedRound, setSelectedRound] = useState<string>(mockRounds[0].round);

  const activeRound = mockRounds.find((round) => round.round === selectedRound) || mockRounds[0];

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-600">
              Mock Interview
            </h1>
            <p className="text-gray-600 mt-2">
              Practice structured hiring conversations and improve your delivery.
            </p>
          </div>
          <button className="rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold shadow hover:bg-blue-700">
            Start Session
          </button>
        </div>

        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockRounds.map((round) => (
            <button
              key={round.id}
              onClick={() => setSelectedRound(round.round)}
              className={`rounded-xl border p-5 text-left transition ${
                selectedRound === round.round
                  ? "border-blue-600 bg-blue-50 shadow"
                  : "border-slate-200 bg-white hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-600">{round.company}</span>
                <span className="text-xs rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  {round.status}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">{round.round}</h2>
              <p className="mt-2 text-sm text-gray-600">Focus: {round.focus}</p>
              <p className="mt-3 text-xs font-medium text-slate-500">Duration: {round.duration}</p>
            </button>
          ))}
        </section>

        <section className="mt-8 rounded-2xl bg-white p-8 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Selected Round</p>
              <h2 className="text-3xl font-bold text-slate-900 mt-2">{activeRound.round}</h2>
            </div>
            <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
              {activeRound.duration}
            </span>
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="rounded-xl bg-slate-100 p-6">
              <h3 className="font-bold text-lg text-slate-900">Interview Agenda</h3>
              <ul className="mt-5 space-y-3 text-slate-700">
                <li>• Introduce yourself and explain the chosen project portfolio.</li>
                <li>• Discuss the technologies in the resume and their real trade-offs.</li>
                <li>• Communicate role fit and learning momentum clearly.</li>
              </ul>
            </div>

            <div className="rounded-xl bg-slate-100 p-6">
              <h3 className="font-bold text-lg text-slate-900">Coach Notes</h3>
              <ul className="mt-5 space-y-3 text-slate-700">
                <li>• Keep answers structured using STAR.</li>
                <li>• Explain your thought process before jumping to the answer.</li>
                <li>• Ask for clarification when a requirement is ambiguous.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}