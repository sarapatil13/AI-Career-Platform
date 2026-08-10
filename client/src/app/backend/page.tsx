"use client";

import { useEffect, useState } from "react";
import { checkBackendHealth } from "@/lib/api";

export default function BackendPage() {
  const [status, setStatus] = useState<{
    message: string;
    ok: boolean;
    checking: boolean;
  }>({ message: "Checking backend...", ok: false, checking: true });

  useEffect(() => {
    let mounted = true;

    checkBackendHealth()
      .then((data) => {
        if (mounted)
          setStatus({ message: data.message, ok: true, checking: false });
      })
      .catch(() => {
        if (mounted)
          setStatus({
            message: "Backend is not running.",
            ok: false,
            checking: false,
          });
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="app-shell flex items-center justify-center py-12">
      <div className="card w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-slate-900">Backend Status</h1>

        {status.checking ? (
          <p className="mt-4 text-lg text-slate-500">Checking...</p>
        ) : (
          <p
            className={`mt-4 inline-block rounded-xl px-4 py-2 text-lg font-semibold ${
              status.ok
                ? "border border-green-300 bg-green-50 text-green-700"
                : "border border-red-300 bg-red-50 text-red-700"
            }`}
          >
            {status.message}
          </p>
        )}
      </div>
    </main>
  );
}
