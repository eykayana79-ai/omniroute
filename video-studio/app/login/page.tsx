"use client";

import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "Login gagal");
    setBusy(false);
  }

  return (
    <main className="shell">
      <form className="card login" onSubmit={onSubmit}>
        <h1>Roselle Video Studio</h1>
        <p className="hint" style={{ marginBottom: 16 }}>
          Masukkan password studio untuk mula.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          aria-label="Password"
        />
        <div style={{ height: 12 }} />
        <button className="btn" disabled={busy || !password}>
          {busy ? "Sekejap..." : "Masuk"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}
