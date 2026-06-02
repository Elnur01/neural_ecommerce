"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import "./admin.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/participants", label: "Participants", icon: "👥" },
  { href: "/admin/sessions", label: "Sessions", icon: "🔗" },
  { href: "/admin/events", label: "Events", icon: "📋" },
  { href: "/admin/interventions", label: "Interventions", icon: "🤖" },
  { href: "/admin/orders", label: "Orders", icon: "🛒" },
  { href: "/admin/surveys", label: "Surveys", icon: "📝" },
  { href: "/admin/export", label: "Export", icon: "📥" },
];

function PinGate({ onSuccess }: { onSuccess: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/admin/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        setError("Invalid PIN. Please try again.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      onSuccess(data.token);
    } catch {
      setError("Cannot reach server. Make sure the backend is running.");
      setLoading(false);
    }
  };

  return (
    <div className="pin-gate">
      <form className="pin-gate-card" onSubmit={handleSubmit}>
        <div className="pin-gate-icon">🔬</div>
        <h1 className="pin-gate-title">Research Admin</h1>
        <p className="pin-gate-subtitle">
          Enter the admin PIN to access the research dashboard
        </p>
        {error && <p className="pin-gate-error">{error}</p>}
        <input
          type="password"
          className="pin-gate-input"
          placeholder="• • • • • •"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoFocus
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%" }}
          disabled={loading || !pin}
        >
          {loading ? "Verifying..." : "Access Dashboard"}
        </button>
      </form>
    </div>
  );
}

function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className={`admin-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="admin-sidebar-header">
        <div className="admin-sidebar-logo">🔬</div>
        {!collapsed && (
          <div>
            <div className="admin-sidebar-title">Neural E-commerce</div>
            <div className="admin-sidebar-subtitle">Research Admin</div>
          </div>
        )}
      </div>

      <nav className="admin-sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <button
              key={item.href}
              className={`admin-nav-link ${isActive ? "active" : ""}`}
              onClick={() => router.push(item.href)}
              title={collapsed ? item.label : undefined}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="admin-sidebar-footer">
        <button className="admin-collapse-btn" onClick={onToggle}>
          {collapsed ? "→" : "← Collapse"}
        </button>
      </div>
    </aside>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const saved = sessionStorage.getItem("admin_token");
    if (saved) setAdminToken(saved);
  }, []);

  const handlePinSuccess = (token: string) => {
    sessionStorage.setItem("admin_token", token);
    setAdminToken(token);
  };

  if (!hydrated) return null;

  if (!adminToken) {
    return <PinGate onSuccess={handlePinSuccess} />;
  }

  return (
    <div className="admin-layout">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <main className={`admin-main ${collapsed ? "sidebar-collapsed" : ""}`}>
        {children}
      </main>
    </div>
  );
}
