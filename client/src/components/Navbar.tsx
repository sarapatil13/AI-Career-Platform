"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    setLoggedIn(Boolean(storedUser));
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLoggedIn(false);
  };

  return (
    <nav className="flex items-center justify-between px-10 py-5 bg-white shadow-md">
      <h1 className="text-2xl font-bold text-blue-600">
        AI Career Platform
      </h1>

      <div className="flex gap-8 font-medium text-gray-700">
        <Link href="/">Home</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/resume" className="hover:text-blue-600 transition">
          Resume
        </Link>
        <Link href="/interview" className="hover:text-blue-600 transition">
          Interview
        </Link>
      </div>

      {loggedIn ? (
        <button onClick={logout} className="rounded-lg bg-slate-700 px-5 py-2 text-white">
          Logout
        </button>
      ) : (
        <Link href="/login">
          <button className="rounded-lg bg-blue-600 px-5 py-2 text-white">
            Login
          </button>
        </Link>
      )}
    </nav>
  );
}