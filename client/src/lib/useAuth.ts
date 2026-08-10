"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

export interface AuthUser {
  name?: string;
  email?: string;
}

export interface AuthState {
  isAuthed: boolean;
  user: AuthUser | null;
}

interface Snapshot {
  hasToken: boolean;
  user: AuthUser | null;
}

const SERVER_SNAPSHOT: Snapshot = { hasToken: false, user: null };

let cached: Snapshot = { hasToken: false, user: null };

const readSnapshot = (): Snapshot => {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;

  const hasToken = Boolean(localStorage.getItem("token"));

  if (!hasToken) {
    if (cached.hasToken) cached = { hasToken: false, user: null };
    return cached;
  }

  let user: AuthUser | null = null;

  try {
    const raw = localStorage.getItem("user");
    if (raw) user = JSON.parse(raw) as AuthUser;
  } catch {
    // Ignore malformed stored user; auth is still valid via token.
  }

  const changed =
    !cached.hasToken ||
    cached.user?.email !== user?.email ||
    cached.user?.name !== user?.name;

  if (changed) cached = { hasToken: true, user };

  return cached;
};

const subscribe = (onStoreChange: () => void) => {
  const handler = () => {
    readSnapshot();
    onStoreChange();
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
};

export function useRequireAuth(): AuthState {
  const router = useRouter();
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => SERVER_SNAPSHOT);

  useEffect(() => {
    if (!snapshot.hasToken) {
      router.replace("/login");
    }
  }, [snapshot.hasToken, router]);

  return {
    isAuthed: snapshot.hasToken,
    user: snapshot.user,
  };
}
