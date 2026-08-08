import Link from "next/link";

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-gray-100 p-10">

      <h1 className="text-4xl font-bold text-blue-600">
        AI Career Dashboard
      </h1>

      <p className="text-gray-600 mt-2">
        Welcome back! Choose what you want to practice today.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/resume" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition cursor-pointer">
          <h2 className="text-2xl font-bold text-blue-600">📄 Resume Analysis</h2>
          <p className="mt-3 text-gray-600">Upload your resume and get ATS score with AI suggestions.</p>
        </Link>

        <Link href="/mock-interview" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition cursor-pointer">
          <h2 className="text-2xl font-bold text-blue-600">🎤 Mock Interview</h2>
          <p className="mt-3 text-gray-600">Practice HR and Technical interviews based on company.</p>
        </Link>

        <Link href="/dsa" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition cursor-pointer">
          <h2 className="text-2xl font-bold text-blue-600">💻 DSA Practice</h2>
          <p className="mt-3 text-gray-600">Solve company-wise coding questions with difficulty levels.</p>
        </Link>

        <Link href="/aptitude" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition cursor-pointer">
          <h2 className="text-2xl font-bold text-blue-600">🧠 Aptitude Round</h2>
          <p className="mt-3 text-gray-600">Practice Quantitative, Logical and Verbal reasoning.</p>
        </Link>

        <Link href="/company" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition cursor-pointer">
          <h2 className="text-2xl font-bold text-blue-600">🏢 Company Preparation</h2>
          <p className="mt-3 text-gray-600">Prepare specifically for companies like Lam Research, Infosys and more.</p>
        </Link>

        <Link href="/profile" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition cursor-pointer">
          <h2 className="text-2xl font-bold text-blue-600">👤 Profile</h2>
          <p className="mt-3 text-gray-600">View your progress, scores and interview history.</p>
        </Link>
      </div>

    </main>
  );
}