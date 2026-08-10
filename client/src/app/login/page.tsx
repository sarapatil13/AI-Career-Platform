"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api, { GOOGLE_AUTH_URL } from "@/lib/api";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  provider?: string;
}

interface AuthResponse {
  data: {
    token: string;
    user: AuthUser;
  };
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const error = params.get("error");
    return error ? decodeURIComponent(error) : "";
  });
  const [messageKind, setMessageKind] = useState<"error" | "success">("error");

  const persistAuth = (res: AuthResponse) => {
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
  };

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ""));

    const token = params.get("token");
    const userParam = params.get("user");

    if (token && userParam) {
      try {
        const user = JSON.parse(userParam) as AuthUser;
        persistAuth({ data: { token, user } });
        window.history.replaceState(null, "", window.location.pathname);
        router.push("/dashboard");
      } catch {
        window.history.replaceState(null, "", window.location.pathname);
      }
    } else if (params.get("error")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [router]);

  const setError = (text: string) => {
    setMessageKind("error");
    setMessage(text);
  };

  const setSuccess = (text: string) => {
    setMessageKind("success");
    setMessage(text);
  };

  const login = async () => {
    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      persistAuth(res);
      setSuccess("Login Successful!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;

      setError(errorMessage || "Login Failed");
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
      setSuccess("Registration Successful!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;

      setError(errorMessage || "Registration Failed");
    }
  };

  const startGoogleLogin = () => {
    window.location.href = GOOGLE_AUTH_URL;
  };

  return (
    <main className="app-shell flex items-center justify-center py-12">
      <div className="card w-full max-w-md">
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setMode("login")}
            className={`rounded-xl px-4 py-2 font-semibold transition ${
              mode === "login"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("register")}
            className={`rounded-xl px-4 py-2 font-semibold transition ${
              mode === "register"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Register
          </button>
        </div>

        <h1 className="mt-6 text-center text-3xl font-bold text-blue-600">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </h1>

        {mode === "register" && (
          <div className="mt-6">
            <label className="block text-sm font-semibold text-slate-700">
              Name
            </label>
            <input
              type="text"
              placeholder="Your name"
              className="input-base mt-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-semibold text-slate-700">
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            className="input-base mt-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold text-slate-700">
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            className="input-base mt-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          onClick={mode === "login" ? login : register}
          className="btn-primary mt-6 w-full"
        >
          {mode === "login" ? "Login" : "Register"}
        </button>

        <button
          onClick={startGoogleLogin}
          className="mt-4 w-full rounded-xl border border-red-500 px-4 py-3 font-semibold text-red-600 transition hover:bg-red-50"
        >
          Continue with Google
        </button>

        {message && (
          <p
            className={`mt-4 rounded-xl p-3 text-center text-sm font-semibold ${
              messageKind === "error"
                ? "border border-red-300 bg-red-50 text-red-700"
                : "border border-green-300 bg-green-50 text-green-700"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
