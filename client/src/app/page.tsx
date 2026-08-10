import Link from "next/link";

const FEATURES = [
  {
    title: "Resume Analysis",
    description: "Upload your resume for an ATS score and AI-generated feedback.",
    href: "/resume",
  },
  {
    title: "DSA Practice",
    description: "Track your readiness across required and preferred topics with real problem links.",
    href: "/dsa",
  },
  {
    title: "Company Prep",
    description: "Analyze your match against target companies and roles.",
    href: "/company",
  },
  {
    title: "Mock Interview",
    description: "Practice structured Technical and HR interviews with AI evaluations.",
    href: "/mock-interview",
  },
  {
    title: "Career Guidance",
    description: "Get role recommendations and a personalized skill roadmap.",
    href: "/career",
  },
  {
    title: "Profile",
    description: "Track streaks, scores, weak topics and next actions in one place.",
    href: "/profile",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <section className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-5xl font-extrabold text-blue-600 sm:text-6xl">
          AI Career Platform
        </h1>

        <p className="mt-8 max-w-3xl text-xl text-gray-700">
          Build ATS-friendly resumes, analyze your profile, practice DSA and
          mock interviews, and prepare for company roles using Artificial
          Intelligence.
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-6">
          <Link href="/resume">
            <button className="rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white transition hover:bg-blue-700">
              Upload Resume
            </button>
          </Link>
          <Link href="/dashboard">
            <button className="rounded-xl border border-blue-600 px-8 py-4 font-semibold text-blue-600 transition hover:bg-blue-50">
              Start Practicing
            </button>
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="card transition hover:shadow-xl"
            >
              <h2 className="text-xl font-bold text-blue-600">
                {feature.title}
              </h2>
              <p className="mt-3 text-gray-600">{feature.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
