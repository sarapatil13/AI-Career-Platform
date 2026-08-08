"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [completedQuestions, setCompletedQuestions] = useState<number[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedQuestions = localStorage.getItem("completedQuestions");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    if (storedQuestions) {
      setCompletedQuestions(JSON.parse(storedQuestions));
    }
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl bg-white shadow-lg p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-blue-600">Profile</h1>
              <p className="text-gray-600 mt-2">Your learning progress summary.</p>
            </div>
            <span className="rounded-full bg-blue-100 px-5 py-3 text-sm font-bold text-blue-700">
              {user?.name || "Student"}
            </span>
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="rounded-xl bg-slate-100 p-6">
              <p className="text-sm font-bold uppercase text-slate-500">Account</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{user?.email || "portfolio.student@example.com"}</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-6">
              <p className="text-sm font-bold uppercase text-slate-500">DSA Progress</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{completedQuestions.length} questions</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-6">
              <p className="text-sm font-bold uppercase text-slate-500">Current Stage</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">Career Readiness</p>
            </div>
          </div>

          <section className="mt-8 rounded-2xl bg-slate-100 p-6">
            <h2 className="text-2xl font-bold text-slate-900">Learning Snapshot</h2>
            <div className="mt-5 grid md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-sm font-bold text-slate-500">Resume Analysis</p>
                <p className="mt-2 text-2xl font-bold text-green-600">ATS Ready</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-sm font-bold text-slate-500">Interview Practice</p>
                <p className="mt-2 text-2xl font-bold text-blue-600">2 sessions</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}