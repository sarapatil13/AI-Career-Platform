"use client";

import { useMemo, useState } from "react";

const aptitudeQuestions = [
  {
    id: 1,
    type: "Arithmetic",
    title: "A train travels 300 km in 4 hours. What is its average speed?",
    options: ["55 km/h", "75 km/h", "60 km/h", "80 km/h"],
    answer: "75 km/h",
  },
  {
    id: 2,
    type: "Reasoning",
    title: "If all engineers are learners and all learners are curious, then all engineers are:",
    options: ["Creators", "Curious", "Managers", "Workers"],
    answer: "Curious",
  },
  {
    id: 3,
    type: "Verbal",
    title: "Choose the correct synonym for 'rapid'.",
    options: ["Slow", "Swift", "Difficult", "Silent"],
    answer: "Swift",
  },
];

export default function AptitudePage() {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});

  const correctCount = useMemo(() => {
    return aptitudeQuestions.filter((question) => selectedAnswers[question.id] === question.answer).length;
  }, [selectedAnswers]);

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-600">Aptitude Round</h1>
            <p className="text-gray-600 mt-2">Quant, reasoning, and verbal quick practice.</p>
          </div>
          <div className="rounded-xl bg-white px-5 py-4 shadow">
            <p className="text-xs uppercase text-slate-500">Score</p>
            <p className="text-2xl font-bold text-slate-900">{correctCount}/{aptitudeQuestions.length}</p>
          </div>
        </div>

        <section className="mt-8 space-y-6">
          {aptitudeQuestions.map((question) => (
            <article key={question.id} className="rounded-2xl bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-blue-100 px-4 py-2 text-xs font-bold uppercase text-blue-700">
                  {question.type}
                </span>
                <span className="text-sm text-slate-500">Question {question.id}</span>
              </div>

              <h2 className="mt-4 text-xl font-bold text-slate-900">{question.title}</h2>

              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {question.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelectedAnswers((current) => ({ ...current, [question.id]: option }))}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      selectedAnswers[question.id] === option
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {selectedAnswers[question.id] && (
                <p className={`mt-4 text-sm font-semibold ${selectedAnswers[question.id] === question.answer ? "text-green-700" : "text-red-700"}`}>
                  {selectedAnswers[question.id] === question.answer ? "Correct" : `Answer: ${question.answer}`}
                </p>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}