"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface EventRow {
  event_id: string;
  session_id: string;
  customer_id: string;
  event_timestamp: string | null;
  event_type: string;
  page_url: string | null;
  product_id: string | null;
  time_on_page_sec: number;
  product_price: number | null;
  discount_rate: number | null;
  scroll_depth_pct: number;
  review_section_visited: boolean;
  images_viewed_count: number;
  back_button_count: number;
  cart_total_at_event: number;
  items_in_cart: number;
  exit_intent_triggered: boolean;
  cart_add_remove_count: number;
  search_bar_used: boolean;
  coupon_applied: boolean;
  shipping_fee: number;
  abandonment_stage: string | null;
}

const EVENT_TYPES = [
  "view", "add_to_cart", "remove_from_cart", "checkout_start",
  "order_completed", "review_section_visit", "exit_intent_shown",
  "exit_intent_dismissed", "exit_intent_accepted", "coupon_search",
  "survey_page_loaded", "scenario_recall_modal_opened",
];

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [fEventType, setFEventType] = useState("");
  const [fCustomerId, setFCustomerId] = useState("");
  const [fSessionId, setFSessionId] = useState("");

  // Column visibility
  const [showCols, setShowCols] = useState({
    product: true,
    scroll: true,
    cart: true,
    engagement: true,
    signals: true,
  });

  const perPage = 50;
  const getToken = () => sessionStorage.getItem("admin_token") || "";

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    const params = new URLSearchParams({
      admin_token: token,
      page: String(page),
      per_page: String(perPage),
    });
    if (fEventType) params.set("event_type", fEventType);
    if (fCustomerId) params.set("customer_id", fCustomerId);
    if (fSessionId) params.set("session_id", fSessionId);

    try {
      const res = await fetch(`${API_URL}/admin/events?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  }, [page, fEventType, fCustomerId, fSessionId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const totalPages = Math.ceil(total / perPage);

  const eventTypeColor = (type: string) => {
    if (type === "order_completed") return "var(--success)";
    if (type === "add_to_cart") return "var(--primary)";
    if (type === "remove_from_cart") return "var(--error)";
    if (type.includes("exit_intent")) return "var(--warning)";
    if (type === "checkout_start") return "var(--accent)";
    return "var(--text-secondary)";
  };

  return (
    <>
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-topbar-title">Events</h1>
        </div>
        <div className="admin-topbar-right">
          <button className="admin-refresh-btn" onClick={() => fetchEvents()}>
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
          <h2 className="admin-section-title">Behavioral Events</h2>
          <p className="admin-section-subtitle">
            All tracked user interactions — {total.toLocaleString()} events total
          </p>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <select
            className="filter-select"
            value={fEventType}
            onChange={(e) => { setFEventType(e.target.value); setPage(1); }}
          >
            <option value="">All Event Types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <input
            className="filter-select"
            placeholder="Customer ID..."
            value={fCustomerId}
            onChange={(e) => { setFCustomerId(e.target.value); setPage(1); }}
            style={{ minWidth: 180 }}
          />

          <input
            className="filter-select"
            placeholder="Session ID..."
            value={fSessionId}
            onChange={(e) => { setFSessionId(e.target.value); setPage(1); }}
            style={{ minWidth: 180 }}
          />
        </div>

        {/* Column toggles */}
        <div className="filter-bar" style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 4 }}>Columns:</span>
          {Object.entries(showCols).map(([key, val]) => (
            <label
              key={key}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 12, color: "var(--text-secondary)", cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={val}
                onChange={() =>
                  setShowCols((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
                }
              />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
          ))}
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner" />
            Loading events...
          </div>
        ) : (
          <div className="data-table-container">
            <div className="data-table-header">
              <span className="data-table-title">Event Stream</span>
              <span className="data-table-count">{total.toLocaleString()} events</span>
            </div>
            <div className="data-table-wrapper" style={{ maxHeight: "65vh", overflowY: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Type</th>
                    <th>Page</th>
                    <th>Time on Page</th>
                    {showCols.scroll && <th>Scroll %</th>}
                    {showCols.product && <th>Product Price</th>}
                    {showCols.engagement && <th>Reviews</th>}
                    {showCols.engagement && <th>Images</th>}
                    {showCols.cart && <th>Cart Total</th>}
                    {showCols.cart && <th>Items</th>}
                    {showCols.cart && <th>Cart Actions</th>}
                    {showCols.signals && <th>Exit Intent</th>}
                    {showCols.signals && <th>Search</th>}
                    {showCols.signals && <th>Coupon</th>}
                    {showCols.signals && <th>Back Btn</th>}
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.event_id}>
                      <td style={{ fontSize: 11, fontFamily: "monospace" }}>
                        {e.event_timestamp
                          ? new Date(e.event_timestamp).toLocaleString("en-GB", {
                              day: "2-digit", month: "short",
                              hour: "2-digit", minute: "2-digit", second: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td>
                        <span style={{
                          color: eventTypeColor(e.event_type),
                          fontWeight: 600,
                          fontSize: 12,
                        }}>
                          {e.event_type}
                        </span>
                      </td>
                      <td style={{ maxWidth: 150 }}>{e.page_url || "—"}</td>
                      <td>{e.time_on_page_sec}s</td>
                      {showCols.scroll && (
                        <td>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 6,
                          }}>
                            <div style={{
                              width: 40, height: 4, background: "var(--border)",
                              borderRadius: 2, overflow: "hidden",
                            }}>
                              <div style={{
                                width: `${Math.min(e.scroll_depth_pct, 100)}%`,
                                height: "100%",
                                background: "var(--primary)",
                                borderRadius: 2,
                              }} />
                            </div>
                            <span style={{ fontSize: 11 }}>{e.scroll_depth_pct}%</span>
                          </div>
                        </td>
                      )}
                      {showCols.product && (
                        <td>{e.product_price ? `₺${e.product_price.toLocaleString()}` : "—"}</td>
                      )}
                      {showCols.engagement && <td>{e.review_section_visited ? "✓" : "—"}</td>}
                      {showCols.engagement && <td>{e.images_viewed_count || "—"}</td>}
                      {showCols.cart && (
                        <td>{e.cart_total_at_event > 0 ? `₺${e.cart_total_at_event.toLocaleString()}` : "—"}</td>
                      )}
                      {showCols.cart && <td>{e.items_in_cart || "—"}</td>}
                      {showCols.cart && <td>{e.cart_add_remove_count || "—"}</td>}
                      {showCols.signals && <td>{e.exit_intent_triggered ? "⚠️" : "—"}</td>}
                      {showCols.signals && <td>{e.search_bar_used ? "🔍" : "—"}</td>}
                      {showCols.signals && <td>{e.coupon_applied ? "🎟️" : "—"}</td>}
                      {showCols.signals && <td>{e.back_button_count || "—"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <span className="pagination-info">
                  Page {page} of {totalPages} ({total.toLocaleString()} total)
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
