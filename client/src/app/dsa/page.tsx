"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DSAPage() {
  const companies = [
    "Lam Research",
    "Infosys",
    "Amazon",
    "Microsoft",
    "Google",
    "Oracle",
  ];

  const difficulties = ["Easy", "Medium", "Hard"];

  const topics = [
    "Arrays",
    "Strings",
    "Linked List",
    "Trees",
    "Graphs",
    "DP",
    "Heap",
    "Trie",
  ];
  
  const [selectedCompany, setSelectedCompany] = useState("");
const [selectedDifficulty, setSelectedDifficulty] = useState("");
const [selectedTopic, setSelectedTopic] = useState("");

const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-100 p-10">

      <h1 className="text-4xl font-bold text-blue-600">
        DSA Practice
      </h1>

      <p className="text-gray-800 mt-2">
        Practice coding questions company-wise.
      </p>

      {/* Companies */}

      <div className="mt-10">

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Choose Company
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

          {companies.map((company) => (
  <button
    key={company}
    onClick={() => setSelectedCompany(company)}
    className={`rounded-xl shadow p-5 transition
      ${
        selectedCompany === company
          ? "bg-blue-600 text-white"
          : "bg-white text-gray-900 hover:bg-blue-100"
      }`}
  >
    {company}
  </button>
))}

        </div>

      </div>

      {/* Difficulty */}

      <div className="mt-10">

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Difficulty
        </h2>

        <div className="flex gap-5">

          {difficulties.map((difficulty) => (
  <button
    key={difficulty}
    onClick={() => setSelectedDifficulty(difficulty)}
    className={`rounded-lg px-6 py-3
      ${
        selectedDifficulty === difficulty
          ? "bg-green-600 text-white"
          : "bg-blue-600 text-white hover:bg-blue-700"
      }`}
  >
    {difficulty}
  </button>
))}
        </div>

      </div>

      {/* Topics */}

      <div className="mt-10">

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Topics
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          {topics.map((topic) => (
  <button
    key={topic}
    onClick={() => setSelectedTopic(topic)}
    className={`rounded-xl shadow p-4 transition
      ${
        selectedTopic === topic
          ? "bg-purple-600 text-white"
          : "bg-white text-gray-900 hover:bg-blue-100"
      }`}
  >
    {topic}
  </button>
))}

        </div>

      </div>

      <button
  onClick={() =>
    router.push(
      `/dsa/questions?company=${selectedCompany}&difficulty=${selectedDifficulty}&topic=${selectedTopic}`
    )
  }
  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700"
>
  Start Practice
</button>

      <div className="mt-10 bg-white rounded-xl shadow p-6">
  <h2 className="text-2xl font-bold text-gray-900">Selected</h2>

  <p className="mt-3 text-gray-800">
    Company: {selectedCompany || "None"}
  </p>

  <p>
    Difficulty: {selectedDifficulty || "None"}
  </p>

  <p>
    Topic: {selectedTopic || "None"}
  </p>
</div>

    </main>
  );
}