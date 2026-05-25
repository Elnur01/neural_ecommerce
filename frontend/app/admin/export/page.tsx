"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXPORT_TABLES = [
  {
    key: "users",
    title: "Users (Participants)",
    desc: "All demographic & profile data: age, gender, city tier, device, scenario assignment, wallet balance, shopping frequency, loyalty tier.",
    icon: "👥",
  },
  {
    key: "sessions",
    title: "Sessions",
    desc: "Session records with start/end timestamps, user agent, abandonment stage, mission alignment scores.",
    icon: "🔗",
  },
  {
    key: "events",
    title: "Events (Behavioral)",
    desc: "Sequential behavioral dataset: page views, scroll depth, review visits, cart actions, exit intent, search usage, coupon interactions — all 19+ fields.",
    icon: "📋",
  },
  {
    key: "orders",
    title: "Orders",
    desc: "Completed orders: totals, shipping fees, coupon codes, discount amounts.",
    icon: "🛒",
  },
  {
    key: "order_items",
    title: "Order Items",
    desc: "Individual items within each order: product ID, quantity, unit price.",
    icon: "📦",
  },
  {
    key: "surveys",
    title: "Post-Session Surveys",
    desc: "Recall tasks, realism scores (1–5), abandonment reasons, mission self-reports, free-text feedback.",
    icon: "📝",
  },
  {
    key: "coupons",
    title: "Coupons",
    desc: "Coupon codes, discount percentages, validity periods, usage limits and counts.",
    icon: "🎟️",
  },
];

export default function ExportPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const getToken = () => sessionStorage.getItem("admin_token") || "";

  const handleDownload = async (tableKey: string) => {
    setDownloading(tableKey);
    const token = getToken();
    try {
      const res = await fetch(
        `${API_URL}/admin/export/${tableKey}?admin_token=${token}`
      );
      if (!res.ok) {
        alert(`Export failed: ${res.status} ${res.statusText}`);
        setDownloading(null);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().split("T")[0];
      a.download = `${tableKey}_${date}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed. Make sure the backend is running.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-topbar-title">Export Data</h1>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-section-header">
          <h2 className="admin-section-title">CSV Export</h2>
          <p className="admin-section-subtitle">
            Download raw data tables as CSV files for external analysis
          </p>
        </div>

        <div className="export-grid">
          {EXPORT_TABLES.map((table) => (
            <div key={table.key} className="export-card">
              <div className="export-card-icon">{table.icon}</div>
              <div className="export-card-title">{table.title}</div>
              <div className="export-card-desc">{table.desc}</div>
              <button
                className="export-card-btn"
                onClick={() => handleDownload(table.key)}
                disabled={downloading === table.key}
              >
                {downloading === table.key ? (
                  <>
                    <div className="admin-loading-spinner" style={{ width: 14, height: 14, marginRight: 0, borderWidth: 1.5 }} />
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download CSV
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
