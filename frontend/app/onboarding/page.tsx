"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { SignupPayload, TokenResponse } from "@/types";

const CITIES = [
  "Istanbul", "Ankara", "Izmir", "Baku", "Kocaeli", "Edirne", "Sivas",
  "Bursa", "Antalya", "Adana", "Bolu", "Igdir", "Rize", "Trabzon", "Van", "Mus",
];

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function OnboardingPage() {
  const router = useRouter();
  const { setToken } = useAuthStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<SignupPayload>({
    email: "",
    password: "",
    age: 25,
    gender: "M",
    city: "Istanbul",
    monthly_shopping_frequency: 3,
    last_online_purchase_date: new Date().toISOString().split("T")[0],
    save_card: "no",
  });

  const update = (field: keyof SignupPayload, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const fingerprintRaw = navigator.userAgent + `${screen.width}x${screen.height}` + Intl.DateTimeFormat().resolvedOptions().timeZone + navigator.language;
      const fingerprint = await sha256(fingerprintRaw);
      const lang = navigator.language.startsWith('tr') ? 'tr' : 'en';

      const finalForm = { ...form, device_fingerprint: fingerprint, lang };
      const { data } = await api.post<TokenResponse>("/auth/signup", finalForm);
      setToken(data.access_token);
      router.push("/scenario");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: "Account", subtitle: "Create your login credentials" },
    { title: "Demographics", subtitle: "Tell us about yourself" },
    { title: "Shopping Habits", subtitle: "Your online shopping behavior" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--gradient-subtle)" }}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-xl font-bold"
            style={{ background: "var(--gradient-brand)" }}
          >
            N
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Welcome to NeuralStore</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Set up your profile to start shopping
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: i <= step ? "var(--primary)" : "var(--border)",
                  color: i <= step ? "white" : "var(--text-muted)",
                }}
              >
                {i < step ? "✓" : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className="w-12 h-0.5 rounded-full" style={{ background: i < step ? "var(--primary)" : "var(--border)" }} />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="card p-8 animate-slide-up">
          <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{steps[step].title}</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{steps[step].subtitle}</p>

          {/* Step 0: Account */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Email</label>
                <input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Password</label>
                <input type="password" className="input" placeholder="Min 6 characters" value={form.password} onChange={(e) => update("password", e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 1: Demographics */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Age</label>
                  <input type="number" className="input" min={18} max={100} value={form.age} onChange={(e) => update("age", parseInt(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Gender</label>
                  <select className="input" value={form.gender} onChange={(e) => update("gender", e.target.value)}>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>City</label>
                <select className="input" value={form.city} onChange={(e) => update("city", e.target.value)}>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Shopping habits */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Monthly shopping frequency (online orders)</label>
                <input type="number" className="input" min={0} max={50} value={form.monthly_shopping_frequency} onChange={(e) => update("monthly_shopping_frequency", parseInt(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Last online purchase date</label>
                <input type="date" className="input" value={form.last_online_purchase_date} onChange={(e) => update("last_online_purchase_date", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Would you save your payment method?</label>
                <div className="flex gap-3">
                  {(["yes", "no"] as const).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => update("save_card", val)}
                      className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                      style={
                        form.save_card === val
                          ? { background: "var(--primary)", color: "white" }
                          : { background: "var(--surface-raised)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
                      }
                    >
                      {val === "yes" ? "Yes, save it" : "No, don't save"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "var(--error)" }}>
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              className="btn btn-ghost"
              style={{ visibility: step === 0 ? "hidden" : "visible" }}
            >
              ← Back
            </button>

            {step < 2 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="btn btn-primary"
                disabled={step === 0 && (!form.email || form.password.length < 6)}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="btn btn-accent"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Account & Shop →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
