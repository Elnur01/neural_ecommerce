"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";

export default function ScenarioPage() {
  const router = useRouter();
  const { user, fetchUser, loading } = useAuthStore();
  const [lang, setLang] = useState<"en" | "tr">("en");
  const [readStartedAt] = useState(Date.now());
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    fetchUser();
    // Default language from browser or user object
    if (typeof navigator !== "undefined") {
      setLang(navigator.language.startsWith("tr") ? "tr" : "en");
    }
  }, []);

  useEffect(() => {
    if (user?.scenario_text_lang) {
      setLang(user.scenario_text_lang as "en" | "tr");
    }
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => setCanContinue(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const handleContinue = async () => {
    if (!user) return;
    const readTimeSec = Math.floor((Date.now() - readStartedAt) / 1000);
    await api.post("/scenario/acknowledge", {
      scenario_id: user.scenario_id,
      scenario_label: user.scenario_label,
      scenario_intent_level: user.scenario_intent_level,
      scenario_text_shown: user.scenario_text_shown,
      scenario_text_lang: lang,
      scenario_text_version: user.scenario_text_version,
      scenario_read_time_sec: readTimeSec,
    });
    router.push("/shop");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--gradient-subtle)" }}>
      <div className="w-full max-w-2xl card p-8 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {lang === "tr" ? "Göreviniz" : "Your Shopping Task"}
          </h1>
          <div className="flex gap-2 bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1 text-sm rounded-md transition-colors cursor-pointer ${lang === "en" ? "bg-white dark:bg-zinc-700 shadow text-gray-900 dark:text-zinc-100 font-medium" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100"}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("tr")}
              className={`px-3 py-1 text-sm rounded-md transition-colors cursor-pointer ${lang === "tr" ? "bg-white dark:bg-zinc-700 shadow text-gray-900 dark:text-zinc-100 font-medium" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100"}`}
            >
              TR
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border mb-8" style={{ borderColor: "var(--border)" }}>
          <p className="text-lg leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
            {user.scenario_text_shown}
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            {lang === "tr"
              ? "Bu tek seferlik bir oturumdur. Harcamadığınız krediler kaybolur. Aldığınız her şey simülasyon içinde sizin olur."
              : "This is a one-time session. Any credits you don't spend are lost. Anything you buy is yours in the simulation."}
          </p>
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className="btn btn-primary w-full max-w-sm mx-auto transition-all"
            style={{ opacity: canContinue ? 1 : 0.5 }}
          >
            {canContinue
              ? (lang === "tr" ? "Anladım, Alışverişe Başla →" : "I understand, Start Shopping →")
              : (lang === "tr" ? "Lütfen görevi dikkatlice okuyun..." : "Please read the task carefully...")}
          </button>
        </div>
      </div>
    </div>
  );
}
