"use client";

import {
  completeMockInterview,
  getMockInterviewOptions,
  getMockInterviewSession,
  listMockInterviewSessions,
  startMockInterview,
  submitMockInterviewAnswer,
} from "@/lib/api";
import type {
  InterviewSession,
  InterviewSessionSummary,
  InterviewQuestion,
  MockInterviewOptions,
} from "@/lib/api";
import { useEffect, useState } from "react";

type Phase = "setup" | "question" | "evaluation" | "results";

export default function MockInterviewPage() {
  const [options, setOptions] = useState<MockInterviewOptions | null>(null);
  const [history, setHistory] = useState<InterviewSessionSummary[]>([]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [answered, setAnswered] = useState<InterviewQuestion | null>(null);

  const [interviewType, setInterviewType] = useState("Technical");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [answerText, setAnswerText] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [optionsResult, sessionsResult] = await Promise.all([
          getMockInterviewOptions(),
          listMockInterviewSessions(),
        ]);
        if (!mounted) return;
        setOptions(optionsResult);
        setRole(optionsResult.roles[0] || "");
        setHistory(sessionsResult.sessions);
      } catch {
        if (mounted) setError("Could not load interview options. Please log in.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const currentQuestion =
    session && phase !== "results"
      ? session.questions[session.currentIndex] || null
      : null;

  const isLastQuestion =
    session !== null && session.currentIndex >= session.totalQuestions - 1;

  const handleStart = async () => {
    if (!role || isWorking) return;
    setIsWorking(true);
    setError("");

    try {
      const result = await startMockInterview({
        interviewType,
        role,
        company: company || null,
        difficulty: interviewType === "Technical" ? difficulty : null,
        totalQuestions,
      });
      setSession(result.session);
      setAnswered(null);
      setAnswerText("");
      setPhase("question");
      const sessions = await listMockInterviewSessions();
      setHistory(sessions.sessions);
    } catch {
      setError("Could not start the interview. Please try again.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleSubmit = async () => {
    if (!session || isWorking) return;
    if (!answerText.trim() && !currentQuestion) return;
    setIsWorking(true);
    setError("");

    try {
      const result = await submitMockInterviewAnswer(session.id, {
        answerText: answerText.trim() ? answerText.trim() : undefined,
      });
      setSession(result.session);
      setAnswered(result.answered);
      setAnswerText("");
      setPhase("evaluation");
    } catch {
      setError("Could not submit the answer. Please try again.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleSkip = async () => {
    if (!session || isWorking) return;
    setIsWorking(true);
    setError("");

    try {
      const result = await submitMockInterviewAnswer(session.id, { skipped: true });
      setSession(result.session);
      setAnswered(result.answered);
      setAnswerText("");
      setPhase("evaluation");
    } catch {
      setError("Could not skip the question. Please try again.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleContinue = () => {
    setAnswered(null);
    if (isLastQuestion) return;
    setPhase("question");
  };

  const handleComplete = async () => {
    if (!session || isWorking) return;
    setIsWorking(true);
    setError("");

    try {
      const result = await completeMockInterview(session.id);
      setSession(result.session);
      setAnswered(null);
      setPhase("results");
      const sessions = await listMockInterviewSessions();
      setHistory(sessions.sessions);
    } catch {
      setError("Could not complete the interview. Please try again.");
    } finally {
      setIsWorking(false);
    }
  };

  const openHistorySession = async (item: InterviewSessionSummary) => {
    setError("");
    try {
      const { session: loaded } = await getMockInterviewSession(item.id);
      setSession(loaded);
      setAnswered(null);
      setAnswerText("");
      setPhase(loaded.status === "completed" ? "results" : "question");
    } catch {
      setError("Could not load that session.");
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

  const optionButton = (
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

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-600">Mock Interview</h1>
        <p className="text-gray-600 mt-2">
          Practice a structured interview with AI-generated questions and honest
          answer evaluations.
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <p className="mt-8 text-gray-500">Loading interview options...</p>
        ) : phase === "setup" ? (
          <section className="mt-8 rounded-2xl bg-white p-8 shadow">
            <h2 className="text-2xl font-bold text-slate-900">Step 1 · Interview type</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {options?.types.map((type) =>
                optionButton(type, interviewType === type, () =>
                  setInterviewType(type)
                )
              )}
            </div>

            <h2 className="mt-8 text-2xl font-bold text-slate-900">Step 2 · Role and company</h2>
            <div className="mt-4 grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Target role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  {options?.roles.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Company (optional)
                </label>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Any company</option>
                  {options?.companies.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {interviewType === "Technical" && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-slate-900">Difficulty</h3>
                <div className="mt-3 flex flex-wrap gap-3">
                  {options?.difficulties.map((entry) =>
                    optionButton(entry, difficulty === entry, () =>
                      setDifficulty(entry)
                    )
                  )}
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-lg font-bold text-slate-900">Number of questions</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {options?.totalQuestionsOptions.map((entry) =>
                  optionButton(String(entry), totalQuestions === entry, () =>
                    setTotalQuestions(entry)
                  )
                )}
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={isWorking}
              className="mt-8 rounded-xl bg-blue-600 px-8 py-3 text-white font-semibold shadow hover:bg-blue-700 disabled:opacity-50"
            >
              {isWorking ? "Starting..." : "Start Interview"}
            </button>
          </section>
        ) : phase === "question" && session && currentQuestion ? (
          <section className="mt-8 rounded-2xl bg-white p-8 shadow">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-100 px-4 py-1 text-xs font-bold text-blue-700">
                Question {session.currentIndex + 1} of {session.totalQuestions}
              </span>
              <span className="text-sm font-semibold text-slate-500">
                {currentQuestion.topic} · {currentQuestion.difficulty || "N/A"}
              </span>
            </div>

            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              {currentQuestion.questionText}
            </h2>
            {currentQuestion.reason && (
              <p className="mt-2 text-sm text-gray-600">{currentQuestion.reason}</p>
            )}

            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={8}
              className="mt-6 w-full rounded-xl border border-slate-300 p-4 text-slate-900 focus:border-blue-500 focus:outline-none"
              placeholder="Type your answer here..."
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={isWorking || !answerText.trim()}
                className="rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {isWorking ? "Submitting..." : "Submit Answer"}
              </button>
              <button
                onClick={handleSkip}
                disabled={isWorking}
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          </section>
        ) : phase === "evaluation" && session && answered ? (
          <section className="mt-8 rounded-2xl bg-white p-8 shadow">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-100 px-4 py-1 text-xs font-bold text-blue-700">
                Question {session.currentIndex} of {session.totalQuestions}
              </span>
              {answered.isSkipped ? (
                <span className="rounded-full bg-slate-200 px-4 py-1 text-sm font-bold text-slate-600">
                  Skipped
                </span>
              ) : answered.evaluationFailed || !answered.evaluation ? (
                <span className="rounded-full bg-yellow-100 px-4 py-1 text-sm font-bold text-yellow-700">
                  Evaluation unavailable
                </span>
              ) : (
                <span className="rounded-full bg-green-100 px-4 py-1 text-sm font-bold text-green-700">
                  {answered.evaluation.score}% · AI evaluation
                </span>
              )}
            </div>

            <h2 className="mt-6 text-xl font-bold text-slate-900">
              {answered.questionText}
            </h2>
            <p className="mt-3 rounded-xl bg-slate-100 p-4 text-slate-700">
              {answered.isSkipped ? "(You skipped this question)" : answered.answerText}
            </p>

            {answered.isSkipped ? (
              <p className="mt-6 text-gray-600">
                Skipped questions are not scored. Continue to the next question.
              </p>
            ) : answered.evaluationFailed || !answered.evaluation ? (
              <p className="mt-6 text-gray-600">
                We could not generate an evaluation for this answer. Your answer
                was still saved, and the session continues without a score for it.
              </p>
            ) : (
              <div className="mt-6">
                {scoreBar("Answer score", answered.evaluation.score ?? 0, "bg-green-500")}
                <p className="mt-2 text-xs text-slate-400">
                  This is an AI-based evaluation, not an objective score.
                </p>

                {answered.evaluation.feedback && (
                  <p className="mt-6 rounded-xl bg-slate-100 p-4 text-slate-800">
                    {answered.evaluation.feedback}
                  </p>
                )}

                <div className="mt-6 grid md:grid-cols-2 gap-6">
                  <div className="rounded-xl bg-green-50 p-6">
                    <h3 className="font-bold text-green-800">Strengths</h3>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      {answered.evaluation.strengths.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-red-50 p-6">
                    <h3 className="font-bold text-red-800">Weaknesses</h3>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      {answered.evaluation.weaknesses.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {answered.evaluation.idealAnswerPoints.length > 0 && (
                  <div className="mt-6 rounded-xl bg-slate-100 p-6">
                    <h3 className="font-bold text-slate-900">What a strong answer includes</h3>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      {answered.evaluation.idealAnswerPoints.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {answered.evaluation.practiceTopics.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-bold text-slate-900">Practice next</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {answered.evaluation.practiceTopics.map((topic) => (
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
              </div>
            )}

            <div className="mt-8 flex gap-3">
              {isLastQuestion ? (
                <button
                  onClick={handleComplete}
                  disabled={isWorking}
                  className="rounded-xl bg-green-600 px-8 py-3 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {isWorking ? "Completing..." : "Complete Interview"}
                </button>
              ) : (
                <button
                  onClick={handleContinue}
                  className="rounded-xl bg-blue-600 px-8 py-3 text-white font-semibold hover:bg-blue-700"
                >
                  Next Question
                </button>
              )}
            </div>
          </section>
        ) : phase === "results" && session ? (
          <section className="mt-8 rounded-2xl bg-white p-8 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
                  {session.interviewType} · {session.company || "General"}
                </p>
                <h2 className="text-3xl font-bold text-slate-900 mt-2">
                  {session.role} Interview Results
                </h2>
              </div>
              {session.overallScore === null ? (
                <span className="rounded-full bg-slate-200 px-4 py-2 text-sm font-bold text-slate-600">
                  No evaluable answers
                </span>
              ) : (
                <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                  {session.overallScore}% Overall
                </span>
              )}
            </div>

            {session.overallScore === null ? (
              <p className="mt-6 text-gray-600">
                This session had no answers that could be evaluated, so no overall
                score was produced.
              </p>
            ) : (
              <div className="mt-8 space-y-4">
                {session.topicPerformance.map((entry) => (
                  <div key={entry.topic}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {entry.topic}{" "}
                        <span className="text-slate-400">
                          ({entry.evaluated} evaluated)
                        </span>
                      </span>
                      <span className="font-bold text-slate-900">{entry.avgScore}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-slate-200">
                      <div
                        className={`h-2 rounded-full ${
                          entry.avgScore >= 70
                            ? "bg-green-500"
                            : entry.avgScore >= 60
                            ? "bg-yellow-400"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${entry.avgScore}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                <p className="pt-2 text-xs text-slate-400">
                  Overall and topic scores are AI-based evaluations, not objective
                  truth.
                </p>
              </div>
            )}

            <div className="mt-8 grid md:grid-cols-2 gap-6">
              {session.sessionStrengths.length > 0 && (
                <div className="rounded-xl bg-green-50 p-6">
                  <h3 className="font-bold text-green-800">Strengths</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {session.sessionStrengths.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {session.weakTopics.length > 0 && (
                <div className="rounded-xl bg-red-50 p-6">
                  <h3 className="font-bold text-red-800">Weak areas</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {session.weakTopics.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {session.practiceTopics.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-slate-900">Recommended practice</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {session.practiceTopics.map((topic) => (
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

            <button
              onClick={() => {
                setSession(null);
                setAnswered(null);
                setPhase("setup");
              }}
              className="mt-8 rounded-xl bg-blue-600 px-8 py-3 text-white font-semibold hover:bg-blue-700"
            >
              Start Another Interview
            </button>
          </section>
        ) : null}

        {history.length > 0 && (
          <section className="mt-8 rounded-2xl bg-white p-8 shadow">
            <h2 className="text-xl font-bold text-slate-900">Past Interviews</h2>
            <div className="mt-4 space-y-3">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => openHistorySession(item)}
                  className="w-full rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {item.interviewType} · {item.role}
                      {item.company ? ` · ${item.company}` : ""}
                    </span>
                    <span className="text-sm font-semibold text-blue-600">
                      {item.status === "completed"
                        ? item.overallScore === null
                          ? "Completed"
                          : `${item.overallScore}%`
                        : "In progress"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.answeredCount}/{item.totalQuestions} answered ·{" "}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
