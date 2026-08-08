"use client";

import { questions } from "@/data/questions";
import { useEffect, useState } from "react";

export default function QuestionsPage() {
  const [params, setParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    const search = window.location.search;
    setParams(new URLSearchParams(search));
  }, []);

  const company = params?.get("company") || "";
  const difficulty = params?.get("difficulty") || "";
  const topic = params?.get("topic") || "";

  const [showHint, setShowHint] = useState<number | null>(null);
  const [showSolution, setShowSolution] = useState<number | null>(null);
  const [completedQuestions, setCompletedQuestions] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];

    const savedProgress = localStorage.getItem("completedQuestions");
    return savedProgress ? JSON.parse(savedProgress) : [];
  });

  useEffect(() => {
    localStorage.setItem(
      "completedQuestions",
      JSON.stringify(completedQuestions)
    );
  }, [completedQuestions]);

  const filteredQuestions = questions.filter((question) => {
    return (
      (!company || question.company === company) &&
      (!difficulty || question.difficulty === difficulty) &&
      (!topic || question.topic === topic)
    );
  });

  const completedCount = completedQuestions.length;
  const totalQuestions = filteredQuestions.length;
  const progress =
    totalQuestions === 0
      ? 0
      : Math.round((completedCount / totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-center mb-10 text-gray-900">
        DSA Questions
      </h1>

      <div className="bg-white rounded-xl shadow-md p-5 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">
          Progress
        </h2>

        <p className="mt-2 text-gray-700">
          Completed: {completedCount} / {totalQuestions}
        </p>

        <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
          <div
            className="bg-green-500 h-3 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <p className="mt-2 font-medium text-gray-800">
          {progress}% Complete
        </p>
      </div>
      <div className="grid gap-6">
        {filteredQuestions.map((question) => (
          <div
            key={question.id}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <h2 className="text-2xl font-bold text-blue-600">
              {question.title}
            </h2>

            <div className="mt-3 text-gray-800 space-y-1">
              <p><strong>Company:</strong> {question.company}</p>
              <p><strong>Difficulty:</strong> {question.difficulty}</p>
              <p><strong>Topic:</strong> {question.topic}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={question.link}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Solve on LeetCode
              </a>

              <button
                onClick={() =>
                  setShowHint(showHint === question.id ? null : question.id)
                }
                className="bg-yellow-400 px-4 py-2 rounded-lg hover:bg-yellow-500"
              >
                Hint
              </button>

              <button
                onClick={() =>
                  setShowSolution(
                    showSolution === question.id ? null : question.id
                  )
                }
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                Solution
              </button>

              <button
                onClick={() => {
                  if (completedQuestions.includes(question.id)) {
                    setCompletedQuestions(
                      completedQuestions.filter((id) => id !== question.id)
                    );
                  } else {
                    setCompletedQuestions([...completedQuestions, question.id]);
                  }
                }}
                className={`px-4 py-2 rounded-lg ${
                  completedQuestions.includes(question.id)
                    ? "bg-green-600 text-white"
                    : "bg-gray-600 text-white hover:bg-gray-700"
                }`}
              >
                {completedQuestions.includes(question.id)
                  ? "✔ Completed"
                  : "Mark Complete"}
              </button>
            </div>

            {showHint === question.id && (
              <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-gray-900">
                <strong>Hint:</strong> {question.hint}
              </div>
            )}
            {showSolution === question.id && (
              <div className="mt-4 bg-green-50 border border-green-300 rounded-lg p-4 text-gray-900">
                <strong>Solution:</strong> {question.solution}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}