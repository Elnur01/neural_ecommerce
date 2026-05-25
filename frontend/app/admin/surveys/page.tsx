"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SurveyRow {
  survey_id: string;
  customer_id: string;
  customer_email: string | null;
  session_id: string;
  scenario_id: string | null;
  survey_lang: string | null;
  intent_to_buy: string | null;
  completed_purchase: boolean | null;
  abandonment_reason: string | null;
  abandonment_reason_other: string | null;
  mission_completed_self_report: string | null;
  mission_recall_text: string | null;
  scenario_realism_score: number | null;
  overall_realism_score: number | null;
  free_text: string | null;
  submitted_at: string | null;
}

interface SurveyStats {
  total_surveys: number;
  avg_scenario_realism: number | null;
  avg_overall_realism: number | null;
  completed_purchase_count: number;
  completion_rate: number;
  intent_distribution: { label: string; count: number }[];
  mission_self_report: { label: string; count: number }[];
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const getToken = () => sessionStorage.getItem("admin_token") || "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    const qs = `?admin_token=${token}`;
    try {
      const [survRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/surveys${qs}`),
        fetch(`${API_URL}/admin/surveys/stats${qs}`),
      ]);
      if (survRes.ok) {
        const data = await survRes.json();
        setSurveys(data.surveys);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      console.error("Failed to fetch surveys:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchData();
  }, [fetchData]);

  // Realism score chart
  useEffect(() => {
    if (chartInstance.current) chartInstance.current.destroy();
    if (!stats || !chartRef.current) return;

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const isDark = document.documentElement.classList.contains("dark") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches &&
        !document.documentElement.classList.contains("light"));
    const textColor = isDark ? "#A1A1AA" : "#6B7280";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Scenario Realism", "Overall Realism"],
        datasets: [{
          data: [stats.avg_scenario_realism || 0, stats.avg_overall_realism || 0],
          backgroundColor: ["#6C3AED", "#F97316"],
          borderRadius: 6,
          barThickness: 40,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 12 } } },
          y: {
            min: 0,
            max: 5,
            grid: { color: gridColor },
            ticks: { color: textColor, stepSize: 1 },
          },
        },
      },
    });

    return () => { chartInstance.current?.destroy(); };
  }, [stats]);

  return (
    <>
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-topbar-title">Surveys</h1>
        </div>
        <div className="admin-topbar-right">
          <button className="admin-refresh-btn" onClick={() => { void fetchData(); }}>
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
          <h2 className="admin-section-title">Post-Session Surveys</h2>
          <p className="admin-section-subtitle">
            Recall tasks, realism feedback (1–5), and exit reasons
          </p>
        </div>

        {/* Stats KPIs */}
        {stats && (
          <div style={{ display: "flex", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 300px" }}>
              <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                <div className="kpi-card">
                  <div className="kpi-card-icon purple">📝</div>
                  <div className="kpi-card-label">Total Surveys</div>
                  <div className="kpi-card-value">{stats.total_surveys}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-card-icon green">✅</div>
                  <div className="kpi-card-label">Purchase Confirmed</div>
                  <div className="kpi-card-value">{stats.completed_purchase_count}</div>
                  <div className="kpi-card-sub">{stats.completion_rate}% rate</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-card-icon yellow">⭐</div>
                  <div className="kpi-card-label">Avg Scenario Realism</div>
                  <div className="kpi-card-value">{stats.avg_scenario_realism ?? "—"}</div>
                  <div className="kpi-card-sub">out of 5</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-card-icon orange">⭐</div>
                  <div className="kpi-card-label">Avg Overall Realism</div>
                  <div className="kpi-card-value">{stats.avg_overall_realism ?? "—"}</div>
                  <div className="kpi-card-sub">out of 5</div>
                </div>
              </div>
            </div>

            <div className="chart-card" style={{ flex: "1 1 300px" }}>
              <div className="chart-card-title">Avg Realism Scores</div>
              <div className="chart-card-subtitle">Scenario vs Overall (out of 5)</div>
              <div style={{ height: 160 }}>
                <canvas ref={chartRef} />
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner" />
            Loading surveys...
          </div>
        ) : surveys.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📝</div>
            <div className="admin-empty-text">No surveys submitted yet</div>
          </div>
        ) : (
          <div className="data-table-container">
            <div className="data-table-header">
              <span className="data-table-title">Survey Responses</span>
              <span className="data-table-count">{surveys.length} responses</span>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Scenario</th>
                    <th>Intent</th>
                    <th>Purchased</th>
                    <th>Mission Recall</th>
                    <th>Scenario Realism</th>
                    <th>Overall Realism</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map((s) => (
                    <Fragment key={s.survey_id}>
                      <tr
                        key={s.survey_id}
                        onClick={() => setExpandedId(expandedId === s.survey_id ? null : s.survey_id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                          {s.customer_email || s.customer_id.slice(0, 8)}
                        </td>
                        <td>
                          <span className="badge badge-primary" style={{ fontSize: 11 }}>
                            {s.scenario_id || "—"}
                          </span>
                        </td>
                        <td>
                          <span className={`intent-badge ${s.intent_to_buy || ""}`}>
                            {s.intent_to_buy || "—"}
                          </span>
                        </td>
                        <td>
                          {s.completed_purchase != null
                            ? s.completed_purchase ? "✅ Yes" : "❌ No"
                            : "—"}
                        </td>
                        <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {s.mission_recall_text || "—"}
                        </td>
                        <td>
                          {s.scenario_realism_score != null ? (
                            <span style={{
                              fontWeight: 700,
                              color: s.scenario_realism_score >= 4 ? "var(--success)" : s.scenario_realism_score >= 3 ? "var(--warning)" : "var(--error)",
                            }}>
                              {s.scenario_realism_score}/5
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          {s.overall_realism_score != null ? (
                            <span style={{
                              fontWeight: 700,
                              color: s.overall_realism_score >= 4 ? "var(--success)" : s.overall_realism_score >= 3 ? "var(--warning)" : "var(--error)",
                            }}>
                              {s.overall_realism_score}/5
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          {s.submitted_at
                            ? new Date(s.submitted_at).toLocaleDateString("en-GB", {
                                day: "2-digit", month: "short",
                              })
                            : "—"}
                        </td>
                      </tr>
                      {expandedId === s.survey_id && (
                        <tr key={`${s.survey_id}-detail`} className="detail-row">
                          <td colSpan={8}>
                            <div className="detail-content">
                              <div className="detail-field">
                                <span className="detail-field-label">Abandonment Reason</span>
                                <span className="detail-field-value">{s.abandonment_reason || "—"}</span>
                              </div>
                              <div className="detail-field">
                                <span className="detail-field-label">Abandonment (Other)</span>
                                <span className="detail-field-value">{s.abandonment_reason_other || "—"}</span>
                              </div>
                              <div className="detail-field">
                                <span className="detail-field-label">Mission Self-Report</span>
                                <span className="detail-field-value">{s.mission_completed_self_report || "—"}</span>
                              </div>
                              <div className="detail-field">
                                <span className="detail-field-label">Mission Recall (Full)</span>
                                <span className="detail-field-value" style={{ whiteSpace: "normal" }}>{s.mission_recall_text || "—"}</span>
                              </div>
                              <div className="detail-field">
                                <span className="detail-field-label">Free Text Feedback</span>
                                <span className="detail-field-value" style={{ whiteSpace: "normal" }}>{s.free_text || "—"}</span>
                              </div>
                              <div className="detail-field">
                                <span className="detail-field-label">Language</span>
                                <span className="detail-field-value">{s.survey_lang || "—"}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
