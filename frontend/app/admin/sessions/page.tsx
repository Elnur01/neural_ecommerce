"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SessionRow {
  session_id: string;
  customer_id: string;
  customer_email: string | null;
  scenario_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_sec: number | null;
  abandonment_stage: string | null;
  mission_alignment_score: number | null;
  mission_completed_inferred: boolean | null;
  event_count: number;
  user_agent: string | null;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function parseUA(ua: string | null): string {
  if (!ua) return "—";
  if (ua.includes("iPhone")) return "📱 iPhone";
  if (ua.includes("Android")) return "📱 Android";
  if (ua.includes("Macintosh")) return "💻 Mac";
  if (ua.includes("Windows")) return "💻 Windows";
  if (ua.includes("Linux")) return "💻 Linux";
  return "🌐 Other";
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fStage, setFStage] = useState("");
  const perPage = 50;

  const getToken = () => sessionStorage.getItem("admin_token") || "";

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    const params = new URLSearchParams({
      admin_token: token,
      page: String(page),
      per_page: String(perPage),
    });
    if (fStage) params.set("abandonment_stage", fStage);

    try {
      const res = await fetch(`${API_URL}/admin/sessions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [page, fStage]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <>
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-topbar-title">Sessions</h1>
        </div>
        <div className="admin-topbar-right">
          <button className="admin-refresh-btn" onClick={() => fetchSessions()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-section-header">
          <h2 className="admin-section-title">Session Tracking</h2>
          <p className="admin-section-subtitle">
            Each participant session with duration, abandonment stage, and mission alignment
          </p>
        </div>

        <div className="filter-bar">
          <select
            className="filter-select"
            value={fStage}
            onChange={(e) => { setFStage(e.target.value); setPage(1); }}
          >
            <option value="">All Stages</option>
            <option value="completed">Completed</option>
            <option value="abandoned_browse">Abandoned (Browse)</option>
            <option value="abandoned_cart">Abandoned (Cart)</option>
            <option value="abandoned_checkout">Abandoned (Checkout)</option>
            <option value="abandoned_payment">Abandoned (Payment)</option>
          </select>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner" />
            Loading sessions...
          </div>
        ) : (
          <div className="data-table-container">
            <div className="data-table-header">
              <span className="data-table-title">Session Log</span>
              <span className="data-table-count">{total} total</span>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Session ID</th>
                    <th>Participant</th>
                    <th>Scenario</th>
                    <th>Started</th>
                    <th>Duration</th>
                    <th>Events</th>
                    <th>Stage</th>
                    <th>Mission Score</th>
                    <th>Mission Done</th>
                    <th>Device</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.session_id}>
                      <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                        {s.session_id.slice(0, 8)}…
                      </td>
                      <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                        {s.customer_email || s.customer_id.slice(0, 8)}
                      </td>
                      <td>
                        <span className="badge badge-primary" style={{ fontSize: 11 }}>
                          {s.scenario_id || "—"}
                        </span>
                      </td>
                      <td>
                        {s.started_at
                          ? new Date(s.started_at).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td>{formatDuration(s.duration_sec)}</td>
                      <td>{s.event_count}</td>
                      <td>
                        {s.abandonment_stage ? (
                          <span className={`stage-badge ${s.abandonment_stage}`}>
                            {s.abandonment_stage.replace("abandoned_", "abn. ")}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>pending</span>
                        )}
                      </td>
                      <td>
                        {s.mission_alignment_score != null
                          ? `${(s.mission_alignment_score * 100).toFixed(0)}%`
                          : "—"}
                      </td>
                      <td>
                        {s.mission_completed_inferred != null
                          ? s.mission_completed_inferred
                            ? "✅"
                            : "❌"
                          : "—"}
                      </td>
                      <td>{parseUA(s.user_agent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <span className="pagination-info">
                  Page {page} of {totalPages} ({total} total)
                </span>
                <div className="pagination-buttons">
                  <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
                  <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
