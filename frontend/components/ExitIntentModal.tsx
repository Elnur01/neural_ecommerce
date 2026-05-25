"use client";

import { useEffect, useState } from "react";
import { useAuthStore, useCartStore } from "@/lib/store";
import tracker from "@/lib/tracker";
import { usePathname } from "next/navigation";

export default function ExitIntentModal() {
  const { user } = useAuthStore();
  const { cart } = useCartStore();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  // Only active on specific pages
  const isTargetPage = pathname?.startsWith("/shop") || pathname?.startsWith("/product") || pathname?.startsWith("/cart");

  useEffect(() => {
    if (!isTargetPage || hasShown || !cart || cart.items.length === 0 || !user) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setShow(true);
        setHasShown(true);
        tracker.track("exit_intent_shown");
        document.removeEventListener("mouseleave", handleMouseLeave);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isTargetPage, hasShown, cart, user]);

  if (!show || !user || !cart) return null;

  const lang = user.scenario_text_lang || "en";
  const unusedBudget = user.credit_balance_initial - cart.total;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-xl max-w-md w-full p-6 animate-slide-up text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          {lang === "tr" ? "Çıkmak istediğinizden emin misiniz?" : "Are you sure you want to leave?"}
        </h3>
        <p className="text-base leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>
          {lang === "tr"
            ? `Sepetinizde ürünler var ve ${unusedBudget.toLocaleString("tr-TR")} TL harcanmamış bütçeniz var.`
            : `You have items in your cart and ${unusedBudget.toLocaleString("en-US")} TRY of unused budget.`}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              setShow(false);
              tracker.track("exit_intent_dismissed");
            }}
            className="btn btn-primary px-6"
          >
            {lang === "tr" ? "Kal ve devam et" : "Stay and continue"}
          </button>
          <button
            onClick={() => {
              tracker.track("exit_intent_accepted");
              window.location.href = "/debrief";
            }}
            className="btn btn-ghost px-6"
          >
            {lang === "tr" ? "Evet, çalışmayı bitir" : "Yes, end study"}
          </button>
        </div>
      </div>
    </div>
  );
}
