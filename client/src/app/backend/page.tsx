"use client";

import { useEffect, useState } from "react";
import { checkBackendHealth } from "@/lib/api";

export default function BackendPage() {
  const [message, setMessage] = useState("Checking backend...");

  useEffect(() => {
    checkBackendHealth()
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("Backend is not running ❌"));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-xl p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Backend Status</h1>

        <p className="text-lg">{message}</p>
      </div>
    </div>
  );
}