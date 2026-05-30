"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useCartStore, useAuthStore } from "@/lib/store";
import tracker from "@/lib/tracker";
import type { Order } from "@/types";

export default function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponCode = searchParams.get("coupon") || "";

  const { cart, fetchCart } = useCartStore();
  const { user, fetchUser } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchCart();
    fetchUser();
    tracker.track("checkout_start");
  }, []);

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post<Order>("/orders", {
        coupon_code: couponCode || null,
      });
      setOrder(data);
      tracker.track("order_completed", {
        cart_total_at_event: data.total,
        items_in_cart: data.items.length,
        coupon_applied: !!data.coupon_code,
        shipping_fee: data.shipping_fee,
      });
      fetchUser(); // refresh balance
      fetchCart(); // clear cart state
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center animate-slide-up">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>Order Confirmed!</h1>
        <p className="mb-2" style={{ color: "var(--text-secondary)" }}>
          Order ID: <span className="font-mono text-sm" style={{ color: "var(--primary)" }}>{order.order_id.slice(0, 8)}...</span>
        </p>

        <div className="card p-6 text-left my-8">
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Order Summary</h3>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between py-2 text-sm" style={{ borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-secondary)" }}>{item.product_name} × {item.quantity}</span>
              <span style={{ color: "var(--text-primary)" }}>{(item.unit_price * item.quantity).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</span>
            </div>
          ))}
          {order.discount_amount > 0 && (
            <div className="flex justify-between py-2 text-sm">
              <span style={{ color: "var(--success)" }}>Discount ({order.coupon_code})</span>
              <span style={{ color: "var(--success)" }}>−{order.discount_amount.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</span>
            </div>
          )}
          <div className="flex justify-between py-2 text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Tax (20%)</span>
            <span style={{ color: "var(--text-primary)" }}>{order.tax?.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Shipping</span>
            <span style={{ color: order.shipping_fee === 0 ? "var(--success)" : "var(--text-primary)" }}>{order.shipping_fee === 0 ? "Free" : `${order.shipping_fee} ₺`}</span>
          </div>
          <div className="flex justify-between pt-3 mt-2 border-t font-bold" style={{ borderColor: "var(--border)" }}>
            <span style={{ color: "var(--text-primary)" }}>Total Paid</span>
            <span style={{ color: "var(--primary)" }}>{order.total.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</span>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button onClick={() => window.location.href = "/debrief"} className="btn btn-primary">
            Complete Study
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>Checkout</h1>

      <div className="card p-6 mb-6">
        <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Order Summary</h2>

        {cart?.items.map((item) => {
          const effectivePrice = (item.product_price || 0) * (1 - (item.product_discount_rate || 0));
          return (
            <div key={item.id} className="flex justify-between py-2 text-sm" style={{ borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-secondary)" }}>{item.product_name} × {item.quantity}</span>
              <span style={{ color: "var(--text-primary)" }}>{(effectivePrice * item.quantity).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</span>
            </div>
          );
        })}

        <div className="space-y-2 mt-4 text-sm">
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
            <span>{cart?.subtotal.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>Tax (20%)</span>
            <span>{cart?.tax?.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>Shipping</span>
            <span style={{ color: cart?.shipping_fee === 0 ? "var(--success)" : undefined }}>{cart?.shipping_fee === 0 ? "Free" : `${cart?.shipping_fee} ₺`}</span>
          </div>
          {couponCode && <div className="flex justify-between"><span style={{ color: "var(--primary)" }}>Coupon: {couponCode}</span></div>}
          <div className="flex justify-between pt-3 border-t font-bold" style={{ borderColor: "var(--border)" }}>
            <span>Total</span>
            <span style={{ color: "var(--primary)" }}>{cart?.total.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</span>
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="card p-4 mb-6 flex justify-between items-center">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Your Credit Balance</span>
        <span className="font-bold" style={{ color: user && cart && user.credit_balance >= cart.total ? "var(--success)" : "var(--error)" }}>
          {user?.credit_balance.toLocaleString("tr-TR")} ₺
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm mb-4" style={{ background: "rgba(239,68,68,0.1)", color: "var(--error)" }}>{error}</div>
      )}

      <button onClick={handlePlaceOrder} disabled={loading || !cart || cart.items.length === 0} className="btn btn-accent w-full btn-lg">
        {loading ? "Processing..." : "Confirm & Pay"}
      </button>

      <p className="text-xs text-center mt-4" style={{ color: "var(--text-muted)" }}>
        This is a simulated purchase. No real payment will be processed.
      </p>
    </div>
  );
}
