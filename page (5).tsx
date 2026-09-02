"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/admin/dashboard");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Login failed.");
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-ink px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6"
      >
        <h1 className="font-display text-xl font-semibold tracking-wide text-bone">
          SCE PICKS ADMIN
        </h1>
        <p className="mt-1 text-sm text-bone/50">Sign in to manage the event.</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="mt-5 w-full rounded-lg border border-line bg-panelLight px-3 py-3 text-sm text-bone placeholder:text-bone/30 focus:border-bone/40"
        />

        {error && <p className="mt-2 text-xs text-young-light">{error}</p>}

        <button
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-bone py-3 font-display text-sm font-semibold tracking-wide text-ink disabled:opacity-40"
        >
          {loading ? "SIGNING IN..." : "SIGN IN"}
        </button>
      </form>
    </main>
  );
}
