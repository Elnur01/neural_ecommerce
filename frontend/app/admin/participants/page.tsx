"use client";

import { useState, useEffect, useCallback, Fragment } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Participant {
  customer_id: string;
  email: string;
  age_group: string;
  raw_age: number | null;
  gender: string;
  raw_city: string;
  city_tier: string;
  preferred_device: string;
  payment_method_saved: boolean;
  monthly_shopping_frequency: number;
  last_purchase_date: string | null;
  loyalty_tier: string;
  credit_balance: number;
  credit_balance_initial: number;
  scenario_id: string;
  scenario_label: string;
  scenario_intent_level: string;
  created_at: string;
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);

  // Filters
  const [fScenario, setFScenario] = useState("");
  const [fAgeGroup, setFAgeGroup] = useState("");
  const [fGender, setFGender] = useState("");

  const perPage = 50;
  const getToken = () => sessionStorage.getItem("admin_token") || "";

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    const params = new URLSearchParams({
      admin_token: token,
      page: String(page),
      per_page: String(perPage),
    });
    if (fScenario) params.set("scenario", fScenario);
    if (fAgeGroup) params.set("age_group", fAgeGroup);
    if (fGender) params.set("gender", fGender);

    try {
      const res = await fetch(`${API_URL}/admin/participants?${params}`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Failed to fetch participants:", err);
    } finally {
      setLoading(false);
    }
  }, [page, fScenario, fAgeGroup, fGender]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchParticipants();
  }, [fetchParticipants]);

  const fetchDetail = async (customerId: string) => {
    if (expandedId === customerId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    const token = getToken();
    try {
      const res = await fetch(
        `${API_URL}/admin/participants/${customerId}?admin_token=${token}`
      );
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
        setExpandedId(customerId);
      }
    } catch (err) {
      console.error("Failed to fetch detail:", err);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  const maskEmail = (email: string) => {
    const [local, domain] = email.split("@");
    if (!domain) return email;
    return `${local.slice(0, 3)}***@${domain}`;
  };

  return (
    <>
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-topbar-title">Participants</h1>
        </div>
        <div className="admin-topbar-right">
          <button className="admin-refresh-btn" onClick={() => { void fetchParticipants(); }}>
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
          <h2 className="admin-section-title">All Participants</h2>
          <p className="admin-section-subtitle">
            Demographic & profile data captured at signup
          </p>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <select
            className="filter-select"
            value={fScenario}
            onChange={(e) => { setFScenario(e.target.value); setPage(1); }}
          >
            <option value="">All Scenarios</option>
            <option value="A_replacement">A — Replacement</option>
            <option value="B_upgrade">B — Upgrade</option>
            <option value="C_gift">C — Gift</option>
            <option value="D_browse">D — Browse</option>
          </select>

          <select
            className="filter-select"
            value={fAgeGroup}
            onChange={(e) => { setFAgeGroup(e.target.value); setPage(1); }}
          >
            <option value="">All Ages</option>
            <option value="18-24">18-24</option>
            <option value="25-34">25-34</option>
            <option value="35-44">35-44</option>
            <option value="45+">45+</option>
          </select>

          <select
            className="filter-select"
            value={fGender}
            onChange={(e) => { setFGender(e.target.value); setPage(1); }}
          >
            <option value="">All Genders</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner" />
            Loading participants...
          </div>
        ) : (
          <div className="data-table-container">
            <div className="data-table-header">
              <span className="data-table-title">Participant Registry</span>
              <span className="data-table-count">{total} total</span>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>City</th>
                    <th>Device</th>
                    <th>Scenario</th>
                    <th>Intent</th>
                    <th>Wallet (Initial)</th>
                    <th>Wallet (Current)</th>
                    <th>Shop Freq</th>
                    <th>Card Saved</th>
                    <th>Loyalty</th>
                    <th>Signed Up</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <Fragment key={p.customer_id}>
                      <tr
                        key={p.customer_id}
                        onClick={() => { void fetchDetail(p.customer_id); }}
                        style={{ cursor: "pointer" }}
                      >
                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                          {maskEmail(p.email)}
                        </td>
                        <td>{p.age_group} {p.raw_age ? `(${p.raw_age})` : ""}</td>
                        <td>{p.gender === "M" ? "♂ Male" : "♀ Female"}</td>
                        <td>
                          {p.raw_city}
                          <br />
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.city_tier}</span>
                        </td>
                        <td>{p.preferred_device}</td>
                        <td>
                          <span className={`badge badge-primary`} style={{ fontSize: 11 }}>
                            {p.scenario_label}
                          </span>
                        </td>
                        <td>
                          <span className={`intent-badge ${p.scenario_intent_level}`}>
                            {p.scenario_intent_level}
                          </span>
                        </td>
                        <td>₺{p.credit_balance_initial.toLocaleString()}</td>
                        <td>₺{p.credit_balance.toLocaleString()}</td>
                        <td>{p.monthly_shopping_frequency}/mo</td>
                        <td>{p.payment_method_saved ? "✓" : "✗"}</td>
                        <td>
                          <span className={`badge ${p.loyalty_tier === "Gold" || p.loyalty_tier === "Platinum" ? "badge-warning" : p.loyalty_tier === "Silver" ? "badge-primary" : "badge-success"}`}>
                            {p.loyalty_tier}
                          </span>
                        </td>
                        <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                      </tr>
                      {expandedId === p.customer_id && detail && (
                        <tr key={`${p.customer_id}-detail`} className="detail-row">
                          <td colSpan={13}>
                            <div className="detail-content">
                              <div className="detail-field">
                                <span className="detail-field-label">Customer ID</span>
                                <span className="detail-field-value" style={{ fontSize: 11 }}>{p.customer_id}</span>
                              </div>
                              <div className="detail-field">
                                <span className="detail-field-label">Sessions</span>
                                <span className="detail-field-value">{detail.sessions?.length || 0}</span>
                              </div>
                              <div className="detail-field">
                                <span className="detail-field-label">Recent Events</span>
                                <span className="detail-field-value">{detail.recent_events?.length || 0}</span>
                              </div>
                              <div className="detail-field">
                                <span className="detail-field-label">Orders</span>
                                <span className="detail-field-value">{detail.orders?.length || 0}</span>
                              </div>
                              <div className="detail-field">
                                <span className="detail-field-label">Last Purchase</span>
                                <span className="detail-field-value">{p.last_purchase_date || "—"}</span>
                              </div>
                              <div className="detail-field">
                                <span className="detail-field-label">Scenario Text</span>
                                <span className="detail-field-value" style={{ whiteSpace: "normal", maxWidth: 400 }}>
                                  {detail.user?.scenario_text_shown?.slice(0, 150)}...
                                </span>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <span className="pagination-info">
                  Page {page} of {totalPages} ({total} total)
                </span>
                <div className="pagination-buttons">
                  <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    ← Prev
                  </button>
                  <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
