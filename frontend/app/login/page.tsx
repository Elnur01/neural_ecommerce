"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { TokenResponse } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const { setToken } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post<TokenResponse>("/auth/login", { email, password });
      setToken(data.access_token);
      router.push("/shop");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--gradient-subtle)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-xl font-bold" style={{ background: "var(--gradient-brand)" }}>N</div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Welcome Back</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Sign in to continue shopping</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-5 animate-slide-up">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Password</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
          </div>

          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "var(--error)" }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/onboarding" className="font-medium" style={{ color: "var(--primary)" }}>
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
