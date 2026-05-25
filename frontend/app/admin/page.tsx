"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Chart,
  DoughnutController,
  BarController,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(
  DoughnutController,
  BarController,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const BRAND_COLORS = [
  "#6C3AED", "#8B5CF6", "#F97316", "#10B981",
  "#3B82F6", "#EF4444", "#F59E0B", "#EC4899",
];

interface OverviewData {
  total_users: number;
  total_sessions: number;
  total_events: number;
  total_orders: number;
  total_surveys: number;
  completion_rate: number;
  avg_scenario_realism: number | null;
  avg_overall_realism: number | null;
  total_revenue: number;
  avg_order_value: number;
  events_today: number;
  completed_sessions: number;
}

interface DemographicData {
  age_groups: { label: string; count: number }[];
  genders: { label: string; count: number }[];
  scenarios: { id: string; label: string; count: number }[];
  devices: { label: string; count: number }[];
  loyalty_tiers: { label: string; count: number }[];
  intent_levels: { label: string; count: number }[];
}

interface FunnelData {
  funnel: { stage: string; count: number }[];
}

interface EventDist {
  distribution: { event_type: string; count: number }[];
}

function KpiCard({
  icon,
  color,
  label,
  value,
  sub,
}: {
  icon: string;
  color: string;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="kpi-card">
      <div className={`kpi-card-icon ${color}`}>{icon}</div>
      <div className="kpi-card-label">{label}</div>
      <div className="kpi-card-value">{value}</div>
      {sub && <div className="kpi-card-sub">{sub}</div>}
    </div>
  );
}

export default function AdminOverview() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [demographics, setDemographics] = useState<DemographicData | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [eventDist, setEventDist] = useState<EventDist | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const scenarioChartRef = useRef<HTMLCanvasElement>(null);
  const eventChartRef = useRef<HTMLCanvasElement>(null);
  const funnelChartRef = useRef<HTMLCanvasElement>(null);
  const deviceChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<Chart[]>([]);

  const getToken = () => sessionStorage.getItem("admin_token") || "";

  const fetchData = useCallback(async () => {
    const token = getToken();
    const headers: Record<string, string> = {};
    const qs = `?admin_token=${token}`;

    try {
      const [ovRes, demoRes, funRes, evtRes] = await Promise.all([
        fetch(`${API_URL}/admin/overview${qs}`),
        fetch(`${API_URL}/admin/demographics${qs}`),
        fetch(`${API_URL}/admin/funnel${qs}`),
        fetch(`${API_URL}/admin/events/distribution${qs}`),
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (demoRes.ok) setDemographics(await demoRes.json());
      if (funRes.ok) setFunnel(await funRes.json());
      if (evtRes.ok) setEventDist(await evtRes.json());
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Charts
  useEffect(() => {
    // Destroy previous chart instances
    chartInstances.current.forEach((c) => c.destroy());
    chartInstances.current = [];

    if (!demographics || !funnel || !eventDist) return;

    const isDark = document.documentElement.classList.contains("dark") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches &&
        !document.documentElement.classList.contains("light"));

    const textColor = isDark ? "#A1A1AA" : "#6B7280";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

    // Scenario Doughnut
    if (scenarioChartRef.current) {
      const ctx = scenarioChartRef.current.getContext("2d");
      if (ctx) {
        const chart = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: demographics.scenarios.map((s) => s.label),
            datasets: [{
              data: demographics.scenarios.map((s) => s.count),
              backgroundColor: BRAND_COLORS.slice(0, demographics.scenarios.length),
              borderWidth: 0,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: { color: textColor, font: { size: 11 }, padding: 12 },
              },
            },
          },
        });
        chartInstances.current.push(chart);
      }
    }

    // Event Distribution Bar
    if (eventChartRef.current) {
      const ctx = eventChartRef.current.getContext("2d");
      if (ctx) {
        const sorted = [...eventDist.distribution].sort((a, b) => b.count - a.count).slice(0, 10);
        const chart = new Chart(ctx, {
          type: "bar",
          data: {
            labels: sorted.map((e) => e.event_type),
            datasets: [{
              data: sorted.map((e) => e.count),
              backgroundColor: "#6C3AED",
              borderRadius: 4,
              barThickness: 20,
            }],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                grid: { color: gridColor },
                ticks: { color: textColor, font: { size: 11 } },
              },
              y: {
                grid: { display: false },
                ticks: { color: textColor, font: { size: 11 } },
              },
            },
          },
        });
        chartInstances.current.push(chart);
      }
    }

    // Funnel Bar
    if (funnelChartRef.current) {
      const ctx = funnelChartRef.current.getContext("2d");
      if (ctx) {
        const chart = new Chart(ctx, {
          type: "bar",
          data: {
            labels: funnel.funnel.map((f) => f.stage),
            datasets: [{
              data: funnel.funnel.map((f) => f.count),
              backgroundColor: funnel.funnel.map((_, i) =>
                BRAND_COLORS[i % BRAND_COLORS.length]
              ),
              borderRadius: 4,
              barThickness: 28,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: textColor, font: { size: 10 }, maxRotation: 45 },
              },
              y: {
                grid: { color: gridColor },
                ticks: { color: textColor, font: { size: 11 } },
                beginAtZero: true,
              },
            },
          },
        });
        chartInstances.current.push(chart);
      }
    }

    // Device Doughnut
    if (deviceChartRef.current) {
      const ctx = deviceChartRef.current.getContext("2d");
      if (ctx) {
        const chart = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: demographics.devices.map((d) => d.label),
            datasets: [{
              data: demographics.devices.map((d) => d.count),
              backgroundColor: ["#3B82F6", "#F97316", "#10B981", "#EF4444"],
              borderWidth: 0,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: { color: textColor, font: { size: 11 }, padding: 12 },
              },
            },
          },
        });
        chartInstances.current.push(chart);
      }
    }

    return () => {
      chartInstances.current.forEach((c) => c.destroy());
      chartInstances.current = [];
    };
  }, [demographics, funnel, eventDist]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <>
        <div className="admin-topbar">
          <div className="admin-topbar-left">
            <h1 className="admin-topbar-title">Overview</h1>
          </div>
        </div>
        <div className="admin-loading">
          <div className="admin-loading-spinner" />
          Loading dashboard data...
        </div>
      </>
    );
  }

  return (
    <>
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-topbar-title">Overview</h1>
        </div>
        <div className="admin-topbar-right">
          <button
            className={`admin-refresh-btn ${refreshing ? "spinning" : ""}`}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* KPI Cards */}
        {overview && (
          <div className="kpi-grid">
            <KpiCard icon="👥" color="purple" label="Participants" value={overview.total_users} sub="Total registered users" />
            <KpiCard icon="🔗" color="blue" label="Sessions" value={overview.total_sessions} sub={`${overview.completed_sessions} completed`} />
            <KpiCard icon="📋" color="orange" label="Events" value={overview.total_events.toLocaleString()} sub={`${overview.events_today} today`} />
            <KpiCard icon="🛒" color="green" label="Orders" value={overview.total_orders} sub={`₺${overview.total_revenue.toLocaleString()} revenue`} />
            <KpiCard icon="✅" color="green" label="Completion Rate" value={`${overview.completion_rate}%`} sub="Sessions → Orders" />
            <KpiCard icon="⭐" color="yellow" label="Avg Realism" value={overview.avg_overall_realism ?? "—"} sub={`Scenario: ${overview.avg_scenario_realism ?? "—"}/5`} />
          </div>
        )}

        {/* Charts */}
        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-card-title">Scenario Distribution</div>
            <div className="chart-card-subtitle">Participants by assigned research scenario</div>
            <div className="chart-canvas-wrapper">
              <canvas ref={scenarioChartRef} />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-title">Event Type Distribution</div>
            <div className="chart-card-subtitle">Top 10 most frequent event types</div>
            <div className="chart-canvas-wrapper">
              <canvas ref={eventChartRef} />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-title">Conversion Funnel</div>
            <div className="chart-card-subtitle">Signup → Scenario → Shop → Cart → Checkout → Order</div>
            <div className="chart-canvas-wrapper">
              <canvas ref={funnelChartRef} />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-title">Device Distribution</div>
            <div className="chart-card-subtitle">Detected device types from User-Agent</div>
            <div className="chart-canvas-wrapper">
              <canvas ref={deviceChartRef} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
