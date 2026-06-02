"use client";

/**
 * InterventionPopup — displays a real-time AI intervention message from the
 * LangGraph agent as a slide-up toast in the bottom-right corner.
 *
 * Modified to offer a 10% discount coupon code (WELCOME10) with an auto-apply button.
 *
 * 5 visual variants mapped to LangGraph action names:
 *   dynamic_discount   → orange accent  (discount offer)
 *   social_proof       → purple primary (social validation)
 *   info_guide         → blue info      (product info)
 *   loyalty_reward     → green success  (loyalty reward)
 *   generic_reminder   → neutral        (cart reminder)
 *
 * Auto-dismisses after AUTO_DISMISS_SEC seconds (progress bar visible).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Intervention } from "@/lib/useInterventionWS";

const AUTO_DISMISS_SEC = 12;

interface ActionConfig {
  emoji: string;
  title: string;
  color: string;
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
  dynamic_discount: {
    emoji: "🎉",
    title: "Special Offer Just For You!",
    color: "var(--accent)",
  },
  social_proof: {
    emoji: "👥",
    title: "You're Not Alone!",
    color: "var(--primary)",
  },
  info_guide: {
    emoji: "💡",
    title: "Need Help Deciding?",
    color: "var(--info)",
  },
  loyalty_reward: {
    emoji: "⭐",
    title: "Loyalty Reward!",
    color: "var(--success)",
  },
  generic_reminder: {
    emoji: "🛒",
    title: "Don't Forget Your Cart!",
    color: "var(--text-secondary)",
  },
};

const FALLBACK_CONFIG: ActionConfig = ACTION_CONFIG.generic_reminder;

interface Props {
  intervention: Intervention | null;
  onDismiss: () => void;
}

export default function InterventionPopup({ intervention, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Show popup whenever a new intervention arrives
  useEffect(() => {
    if (!intervention) return;
    setVisible(true);

    // Auto-dismiss
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, AUTO_DISMISS_SEC * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [intervention, onDismiss]);

  if (!visible || !intervention) return null;

  const config = ACTION_CONFIG[intervention.action] ?? FALLBACK_CONFIG;

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    onDismiss();
  };

  const handleApplyCoupon = () => {
    localStorage.setItem("applied_coupon", "WELCOME10");
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    onDismiss();
    router.push("/cart");
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-full max-w-sm animate-slide-up"
      role="alert"
      aria-live="polite"
    >
      <div
        className="rounded-2xl shadow-2xl p-5"
        style={{
          background: "var(--surface)",
          border: `2px solid ${config.color}`,
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header row */}
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none select-none" aria-hidden="true">
            {config.emoji}
          </span>

          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm" style={{ color: config.color }}>
              {config.title}
            </h4>
            <p
              className="text-sm mt-1 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {intervention.message}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label="Dismiss notification"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Coupon Code Section */}
        <div
          className="mt-4 p-3 rounded-xl border border-dashed flex items-center justify-between"
          style={{ borderColor: config.color, background: "var(--surface-raised)" }}
        >
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Discount Coupon
            </span>
            <div className="font-mono font-bold text-lg tracking-wider" style={{ color: "var(--text-primary)" }}>
              WELCOME10
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-500/10 text-amber-500">
            10% OFF
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={handleApplyCoupon}
          className="mt-4 w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] cursor-pointer"
          style={{
            background: config.color,
            color: "#fff",
            boxShadow: `0 4px 12px ${config.color}33`,
            border: "none",
          }}
        >
          Apply Coupon & View Cart
        </button>

        {/* Auto-dismiss progress bar */}
        <div
          className="mt-3 h-0.5 rounded-full overflow-hidden"
          style={{ background: "var(--border)" }}
        >
          <div
            className="h-full rounded-full intervention-progress"
            style={{
              background: config.color,
              animationDuration: `${AUTO_DISMISS_SEC}s`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
