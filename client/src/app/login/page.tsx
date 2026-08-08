"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const persistAuth = (res: any) => {
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
  };

  const login = async () => {
    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      persistAuth(res);
      setMessage("Login Successful!");
      router.push("/dashboard");
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Login Failed");
    }
  };

  const register = async () => {
    try {
      const res = await api.post("/auth/register", {
        name,
        email,
        password,
      });

      persistAuth(res);
      setMessage("Registration Successful!");
      router.push("/dashboard");
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Registration Failed");
    }
  };

  const startGoogleLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/google";
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-xl rounded-2xl p-10 w-[420px]">
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setMode("login")}
            className={`px-4 py-2 rounded ${mode === "login" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("register")}
            className={`px-4 py-2 rounded ${mode === "register" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
          >
            Register
          </button>
        </div>

        <h1 className="text-3xl font-bold text-center text-blue-600">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </h1>

        {mode === "register" && (
          <input
            type="text"
            placeholder="Name"
            className="w-full mt-8 border rounded-lg p-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full mt-4 border rounded-lg p-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mt-4 border rounded-lg p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={mode === "login" ? login : register}
          className="w-full mt-6 bg-blue-600 text-white rounded-lg py-3 hover:bg-blue-700 transition"
        >
          {mode === "login" ? "Login" : "Register"}
        </button>

        <button
          onClick={startGoogleLogin}
          className="w-full mt-4 border border-red-500 text-red-600 rounded-lg py-3 hover:bg-red-50 transition"
        >
          Continue with Google
        </button>

        <p className="mt-4 text-center text-red-500">{message}</p>
      </div>
    </main>
  );
}