import Navbar from "../components/Navbar";
export default function Home() {
  return (
    <>
  <Navbar />
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white">

      <section className="flex flex-col items-center justify-center text-center px-6 py-28">

        <h1 className="text-6xl font-extrabold text-blue-600">
          AI Career Platform
        </h1>

        <p className="mt-8 max-w-3xl text-xl text-gray-700">
          Build ATS-friendly resumes, analyze your profile,
          predict placement chances, and prepare for interviews
          using Artificial Intelligence.
        </p>

        <div className="mt-12 flex gap-6">

          <button className="rounded-xl bg-blue-600 px-8 py-4 text-white font-semibold hover:bg-blue-700 transition">
            Upload Resume
          </button>

          <button className="rounded-xl border border-blue-600 px-8 py-4 text-blue-600 font-semibold hover:bg-blue-50 transition">
            Learn More
          </button>

        </div>

      </section>

    </main>
    </>
  );
}