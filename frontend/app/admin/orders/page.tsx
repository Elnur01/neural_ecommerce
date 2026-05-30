"use client";

import { useState, useEffect, useCallback, Fragment } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface OrderRow {
  order_id: string;
  customer_id: string;
  customer_email: string | null;
  total: number;
  shipping_fee: number;
  coupon_code: string | null;
  discount_amount: number;
  created_at: string | null;
  items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getToken = () => sessionStorage.getItem("admin_token") || "";

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/admin/orders?admin_token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchOrders();
  }, [fetchOrders]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const couponUsage = orders.filter((o) => o.coupon_code).length;

  return (
    <>
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-topbar-title">Orders</h1>
        </div>
        <div className="admin-topbar-right">
          <button className="admin-refresh-btn" onClick={() => { void fetchOrders(); }}>
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
          <h2 className="admin-section-title">Order History</h2>
          <p className="admin-section-subtitle">
            All completed orders with items, totals, and coupon usage
          </p>
        </div>

        {/* Summary KPIs */}
        {!loading && (
          <div className="kpi-grid" style={{ marginBottom: 24 }}>
            <div className="kpi-card">
              <div className="kpi-card-icon green">🛒</div>
              <div className="kpi-card-label">Total Orders</div>
              <div className="kpi-card-value">{total}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-icon purple">💰</div>
              <div className="kpi-card-label">Total Revenue</div>
              <div className="kpi-card-value">₺{totalRevenue.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-icon blue">📊</div>
              <div className="kpi-card-label">Avg Order Value</div>
              <div className="kpi-card-value">₺{avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-icon orange">🎟️</div>
              <div className="kpi-card-label">Coupon Usage</div>
              <div className="kpi-card-value">{couponUsage}</div>
              <div className="kpi-card-sub">{orders.length > 0 ? `${((couponUsage / orders.length) * 100).toFixed(0)}% of orders` : ""}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner" />
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">🛒</div>
            <div className="admin-empty-text">No orders found</div>
          </div>
        ) : (
          <div className="data-table-container">
            <div className="data-table-header">
              <span className="data-table-title">Order Records</span>
              <span className="data-table-count">{total} orders</span>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Shipping</th>
                    <th>Coupon</th>
                    <th>Discount</th>
                    <th>Items</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <Fragment key={o.order_id}>
                      <tr
                        onClick={() => setExpandedId(expandedId === o.order_id ? null : o.order_id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                          {o.order_id.slice(0, 8)}…
                        </td>
                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                          {o.customer_email || o.customer_id.slice(0, 8)}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--success)" }}>
                          ₺{o.total.toLocaleString()}
                        </td>
                        <td>₺{o.shipping_fee}</td>
                        <td>
                          {o.coupon_code ? (
                            <span className="badge badge-warning">{o.coupon_code}</span>
                          ) : "—"}
                        </td>
                        <td>{o.discount_amount > 0 ? `₺${o.discount_amount}` : "—"}</td>
                        <td>{o.items.length} item{o.items.length !== 1 ? "s" : ""}</td>
                        <td>
                          {o.created_at
                            ? new Date(o.created_at).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                      </tr>
                      {expandedId === o.order_id && (
                        <tr key={`${o.order_id}-items`} className="detail-row">
                          <td colSpan={8}>
                            <div style={{ padding: "4px 0" }}>
                              <strong style={{ fontSize: 12, color: "var(--text-muted)" }}>ORDER ITEMS</strong>
                              <table className="data-table" style={{ marginTop: 8 }}>
                                <thead>
                                  <tr>
                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Unit Price</th>
                                    <th>Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {o.items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{item.product_name}</td>
                                      <td>{item.quantity}</td>
                                      <td>₺{item.unit_price.toLocaleString()}</td>
                                      <td style={{ fontWeight: 600 }}>₺{(item.quantity * item.unit_price).toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
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
