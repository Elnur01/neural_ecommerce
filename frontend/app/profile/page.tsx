"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import Link from "next/link";

const SEGMENT_EXPLANATIONS: Record<string, (raw: string | number | null) => string> = {
  age_group: (raw) => `Your age (${raw}) places you in this bracket for demographic analysis.`,
  city_tier: (raw) => {
    const tiers: Record<string, string> = {
      "Tier-1": "one of the four largest metropolitan areas (Istanbul, Ankara, Izmir, Baku)",
      "Tier-2": "a mid-size city with growing commercial activity",
      "Tier-3": "a smaller city or town",
    };
    return `Your city is classified as ${raw} because it is ${tiers[String(raw)] || "in the default tier"}.`;
  },
  loyalty_tier: (raw) => `Based on your estimated total order value, you are ranked as ${raw}. Thresholds: Bronze (<5K), Silver (<15K), Gold (<30K), Platinum (30K+).`,
  preferred_device: (raw) => `Detected from your browser's User-Agent string at signup: ${raw}.`,
  payment_method_saved: (raw) => `You ${raw ? "chose to" : "chose not to"} save your payment method during onboarding.`,
};

export default function ProfilePage() {
  const { user, fetchUser, loading } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, []);

  if (loading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-lg" style={{ background: "var(--border)" }} />
          <div className="card p-8 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-6 rounded-lg" style={{ background: "var(--border)" }} />)}
          </div>
        </div>
      </div>
    );
  }

  const segments = [
    { label: "Age Group", raw: `Age: ${user.raw_age}`, derived: user.age_group, key: "age_group" },
    { label: "Gender", raw: user.gender, derived: user.gender, key: "gender" },
    { label: "City Tier", raw: `City: ${user.raw_city}`, derived: user.city_tier, key: "city_tier" },
    { label: "Account Age", raw: `Since: ${user.last_purchase_date || "N/A"}`, derived: `${user.account_age_days} days`, key: "account_age" },
    { label: "Lifetime Orders", raw: `Monthly freq: ${user.monthly_shopping_frequency}`, derived: `${user.lifetime_order_count} orders`, key: "lifetime_orders" },
    { label: "Total Value", raw: "-", derived: `${user.total_order_value.toLocaleString("tr-TR")} ₺`, key: "total_value" },
    { label: "Avg Order Value", raw: "-", derived: `${user.avg_order_value.toLocaleString("tr-TR")} ₺`, key: "avg_value" },
    { label: "Loyalty Tier", raw: `Total: ${user.total_order_value.toLocaleString("tr-TR")} ₺`, derived: user.loyalty_tier, key: "loyalty_tier" },
    { label: "Device", raw: "Auto-detected", derived: user.preferred_device, key: "preferred_device" },
    { label: "Payment Saved", raw: user.payment_method_saved ? "Yes" : "No", derived: user.payment_method_saved ? "✓ Saved" : "✗ Not saved", key: "payment_method_saved" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold" style={{ background: "var(--gradient-brand)" }}>
          {user.email.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{user.email}</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Member since {user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "N/A"}
          </p>
        </div>
      </div>

      {/* Credit balance card */}
      <div className="card p-6 mb-8" style={{ background: "var(--gradient-brand)" }}>
        <div className="text-white">
          <p className="text-sm opacity-80 mb-1">Credit Balance</p>
          <p className="text-4xl font-bold">{user.credit_balance.toLocaleString("tr-TR")} ₺</p>
          <p className="text-sm opacity-60 mt-2">
            Your initial budget of <strong>{user.credit_balance_initial?.toLocaleString()} TRY</strong> was assigned based on your age group <strong>({user.age_group})</strong> and loyalty tier <strong>({user.loyalty_tier})</strong>, reflecting average disposable income for Turkish online shoppers in this segment.
          </p>
        </div>
      </div>

      {/* Scenario Transparency */}
      <div className="mb-8 card p-6 bg-indigo-50 border-indigo-100 border">
        <h2 className="text-xl font-bold mb-2 text-indigo-900">Your Research Scenario</h2>
        <p className="text-sm mb-4 text-indigo-800">
          You were assigned the <strong>"{user.scenario_label}"</strong> scenario. Your assigned budget reflects the spending capacity of a {user.age_group} year-old {user.loyalty_tier}-tier shopper.
        </p>
        <div className="bg-white p-4 rounded-lg border border-indigo-100">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{user.scenario_text_shown}</p>
        </div>
      </div>

      {/* Segment transparency */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Your Segments</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Transparency: here&apos;s exactly how your demographic data was classified for this research study.
        </p>

        <div className="space-y-3">
          {segments.map((seg) => (
            <div key={seg.key} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-xs font-medium mb-1" style={{ color: "var(--primary)" }}>{seg.label}</div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>{seg.raw}</span>
                    <span style={{ color: "var(--text-muted)" }}>→</span>
                    <span className="font-semibold text-sm badge badge-primary">{seg.derived}</span>
                  </div>
                </div>
              </div>
              {SEGMENT_EXPLANATIONS[seg.key] && (
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  {SEGMENT_EXPLANATIONS[seg.key](seg.derived)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Order history link */}
      <div className="card p-6 text-center">
        <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Order History</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          You have placed {user.lifetime_order_count} order{user.lifetime_order_count !== 1 ? "s" : ""}.
        </p>
        <Link href="/shop" className="btn btn-primary btn-sm">Continue Shopping</Link>
      </div>
    </div>
  );
}
