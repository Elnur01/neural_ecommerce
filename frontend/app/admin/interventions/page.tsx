"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface InterventionLogItem {
  log_id: string;
  session_id: string;
  user_id: string;
  segment: string;
  abandonment_probability: number;
  cart_value: number;
  action: string | null;
  message: string | null;
  ab_group: "treatment" | "control";
  timestamp: string | null;
}

interface LogsResponse {
  total: number;
  page: number;
  per_page: number;
  items: InterventionLogItem[];
}

interface Stats {
  total: number;
  ab_breakdown: Record<string, number>;
  segment_breakdown: Record<string, number>;
  action_breakdown: Record<string, number>;
  avg_abandonment_prob: number;
  avg_cart_value: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEGMENT_LABELS: Record<string, string> = {
  price_sensitive:    "Price Sensitive",
  needs_social_proof: "Social Proof",
  loyal_returner:     "Loyal Returner",
  distracted:         "Distracted",
  comparison_shopping:"Comparison",
};

const ACTION_COLORS: Record<string, string> = {
  dynamic_discount: "bg-orange-100 text-orange-800",
  social_proof:     "bg-purple-100 text-purple-800",
  info_guide:       "bg-blue-100 text-blue-800",
  loyalty_reward:   "bg-green-100 text-green-800",
  generic_reminder: "bg-gray-100 text-gray-700",
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InterventionsDashboard() {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [logs, setLogs]       = useState<InterventionLogItem[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Filters
  const [segmentFilter, setSegmentFilter] = useState("");
  const [actionFilter, setActionFilter]   = useState("");
  const [abFilter, setAbFilter]           = useState("");

  const PER_PAGE = 50;

  const getToken = () => sessionStorage.getItem("admin_token") || "";

  const fetchStats = useCallback(async () => {
    try {
      const token = getToken();
      const { data } = await api.get<Stats>(`/admin/interventions/stats?admin_token=${token}`);
      setStats(data);
    } catch {
      // stats are non-critical — silently ignore
    }
  }, []);

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const params: Record<string, string | number> = { 
        page: p, 
        per_page: PER_PAGE,
        admin_token: token
      };
      if (segmentFilter) params.segment  = segmentFilter;
      if (actionFilter)  params.action   = actionFilter;
      if (abFilter)      params.ab_group = abFilter;

      const { data } = await api.get<LogsResponse>("/admin/interventions", { params });
      setLogs(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to load intervention logs.");
    } finally {
      setLoading(false);
    }
  }, [segmentFilter, actionFilter, abFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [segmentFilter, actionFilter, abFilter, fetchLogs]);

  const totalPages = Math.ceil(total / PER_PAGE);

  // ── Stats cards ─────────────────────────────────────────────────────────────
  const treatmentCount = stats?.ab_breakdown?.treatment ?? 0;
  const controlCount   = stats?.ab_breakdown?.control   ?? 0;
  const totalAB        = treatmentCount + controlCount;
  const treatmentPct   = totalAB > 0 ? Math.round((treatmentCount / totalAB) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Intervention Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time LSTM + LangGraph abandonment interventions with A/B analytics
          </p>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Triggers"
              value={stats.total}
              sub="sessions above 70% threshold"
            />
            <StatCard
              title="Treatment Rate"
              value={`${treatmentPct}%`}
              sub={`${treatmentCount} shown / ${controlCount} suppressed`}
            />
            <StatCard
              title="Avg Abandon Prob"
              value={`${(stats.avg_abandonment_prob * 100).toFixed(1)}%`}
              sub="across all triggered sessions"
            />
            <StatCard
              title="Avg Cart Value"
              value={`$${stats.avg_cart_value.toFixed(2)}`}
              sub="at time of intervention"
            />
          </div>
        )}

        {/* Breakdown charts (simple bar-style) */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <BreakdownCard title="By Segment" data={stats.segment_breakdown} labelMap={SEGMENT_LABELS} />
            <BreakdownCard title="By Action (treatment)" data={stats.action_breakdown} />
            <BreakdownCard
              title="A/B Split"
              data={stats.ab_breakdown}
              labelMap={{ treatment: "Treatment (shown)", control: "Control (suppressed)" }}
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={segmentFilter}
            onChange={e => setSegmentFilter(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm bg-white"
          >
            <option value="">All Segments</option>
            {Object.entries(SEGMENT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm bg-white"
          >
            <option value="">All Actions</option>
            {["dynamic_discount", "social_proof", "info_guide", "loyalty_reward", "generic_reminder"].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={abFilter}
            onChange={e => setAbFilter(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm bg-white"
          >
            <option value="">All Groups</option>
            <option value="treatment">Treatment</option>
            <option value="control">Control</option>
          </select>

          <span className="text-sm text-gray-500 self-center">{total} results</span>
        </div>

        {/* Table */}
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 text-sm">{error}</div>
        ) : loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No interventions recorded yet.</div>
        ) : (
          <>
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-left">Segment</th>
                    <th className="px-4 py-3 text-left">Prob</th>
                    <th className="px-4 py-3 text-left">Cart</th>
                    <th className="px-4 py-3 text-left">A/B</th>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map(log => (
                    <tr key={log.log_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {SEGMENT_LABELS[log.segment] ?? log.segment}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {(log.abandonment_probability * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 font-mono">
                        ${log.cart_value.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={log.ab_group}
                          colorClass={log.ab_group === "treatment"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {log.action ? (
                          <Badge
                            label={log.action}
                            colorClass={ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"}
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-gray-600">
                        {log.message ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => { setPage(p => p - 1); fetchLogs(page - 1); }}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => { setPage(p => p + 1); fetchLogs(page + 1); }}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ title, value, sub }: { title: string; value: string | number; sub: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function BreakdownCard({
  title,
  data,
  labelMap = {},
}: {
  title: string;
  data: Record<string, number>;
  labelMap?: Record<string, string>;
}) {
  const total  = Object.values(data).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">{title}</p>
      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400">No data yet</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(([key, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={key}>
                <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                  <span>{labelMap[key] ?? key}</span>
                  <span>{count} ({pct}%)</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
