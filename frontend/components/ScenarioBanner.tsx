"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import tracker from "@/lib/tracker";

export default function ScenarioBanner() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);

  // Only show on specific pages
  const isTargetPage = pathname?.startsWith("/shop") || pathname?.startsWith("/product") || pathname?.startsWith("/cart");

  if (!isTargetPage || !user || !user.scenario_id) {
    return null;
  }

  const lang = user.scenario_text_lang || "en";
  
  const openScenarioModal = () => {
    setModalOpen(true);
    tracker.track("scenario_recall_modal_opened");
  };

  return (
    <>
      <div className="bg-indigo-600 text-white px-4 py-2 text-sm flex items-center justify-between shadow-sm relative z-40">
        <div className="flex-1 text-center md:text-left flex flex-wrap items-center gap-2 justify-center md:justify-start">
          <span className="font-semibold">
            {lang === "tr" ? "Göreviniz" : "Your task"}:
          </span>
          <span className="mr-2">{user.scenario_label}</span>
          <span className="opacity-60 hidden md:inline">·</span>
          <span className="font-semibold ml-2">
            {lang === "tr" ? "Bütçe" : "Budget"}:
          </span>
          <span>{user.credit_balance_initial?.toLocaleString(lang === "tr" ? "tr-TR" : "en-US")} TRY</span>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={openScenarioModal}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-xs transition-colors font-medium"
          >
            {lang === "tr" ? "Tam metni göster" : "Show full task"}
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface border border-border rounded-xl shadow-xl max-w-lg w-full p-6 animate-slide-up relative">
            <h3 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              {lang === "tr" ? "Alışveriş Göreviniz" : "Your Shopping Task"}
            </h3>
            <p className="text-base leading-relaxed mb-6 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
              {user.scenario_text_shown}
            </p>
            <div className="text-right">
              <button
                onClick={() => setModalOpen(false)}
                className="btn btn-primary"
              >
                {lang === "tr" ? "Kapat" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
