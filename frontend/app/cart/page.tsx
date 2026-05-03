"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore, useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import type { CouponValidation } from "@/types";

export default function CartPage() {
  const { cart, fetchCart, updateQuantity, removeItem, loading } = useCartStore();
  const { user, fetchUser } = useAuthStore();
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponValidation | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    fetchCart();
    fetchUser();
  }, []);

  const handleCouponValidate = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data } = await api.post<CouponValidation>("/reviews/../coupons/validate", { code: couponCode });
      setCouponResult(data);
    } catch {
      setCouponResult({ valid: false, discount_pct: null, message: "Failed to validate coupon." });
    } finally {
      setCouponLoading(false);
    }
  };

  const discountAmount = couponResult?.valid && couponResult.discount_pct && cart
    ? cart.subtotal * couponResult.discount_pct : 0;
  const finalTotal = cart ? cart.subtotal + cart.shipping_fee - discountAmount : 0;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-6">🛒</div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>Your cart is empty</h1>
        <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Browse our collection and add some tech gadgets!</p>
        <Link href="/shop" className="btn btn-primary">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8" style={{ color: "var(--text-primary)" }}>Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => {
            const effectivePrice = (item.product_price || 0) * (1 - (item.product_discount_rate || 0));
            return (
              <div key={item.id} className="card p-4 flex gap-4 items-center">
                <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl shrink-0" style={{ background: "var(--surface-raised)" }}>
                  🛍️
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{item.product_name}</h3>
                  <p className="text-sm mt-1" style={{ color: "var(--primary)" }}>
                    {effectivePrice.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
                    {item.product_discount_rate! > 0 && (
                      <span className="line-through ml-2" style={{ color: "var(--text-muted)" }}>
                        {item.product_price?.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
                      </span>
                    )}
                  </p>
                </div>
                {/* Quantity controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium"
                    style={{ background: "var(--surface-raised)", color: "var(--text-secondary)" }}
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-medium text-sm" style={{ color: "var(--text-primary)" }}>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium"
                    style={{ background: "var(--surface-raised)", color: "var(--text-secondary)" }}
                  >
                    +
                  </button>
                </div>
                {/* Line total */}
                <div className="text-right min-w-[80px]">
                  <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                    {(effectivePrice * item.quantity).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
                  </span>
                </div>
                {/* Remove */}
                <button onClick={() => removeItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-50" title="Remove">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {/* Order summary */}
        <div>
          <div className="card p-6 sticky top-24">
            <h2 className="font-semibold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Order Summary</h2>

            {/* Coupon */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="input flex-1"
              />
              <button onClick={handleCouponValidate} disabled={couponLoading} className="btn btn-ghost btn-sm">
                {couponLoading ? "..." : "Apply"}
              </button>
            </div>
            {couponResult && (
              <div className={`text-xs mb-4 p-2 rounded-lg ${couponResult.valid ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                {couponResult.message}
              </div>
            )}

            {/* Totals */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
                <span style={{ color: "var(--text-primary)" }}>{cart.subtotal.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }}>Shipping</span>
                <span style={{ color: cart.shipping_fee === 0 ? "var(--success)" : "var(--text-primary)" }}>
                  {cart.shipping_fee === 0 ? "Free" : `${cart.shipping_fee} ₺`}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: "var(--success)" }}>Discount</span>
                  <span style={{ color: "var(--success)" }}>−{discountAmount.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between" style={{ borderColor: "var(--border)" }}>
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Total</span>
                <span className="font-bold text-lg" style={{ color: "var(--primary)" }}>
                  {finalTotal.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
                </span>
              </div>
            </div>

            {/* Balance check */}
            {user && (
              <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: "var(--surface-raised)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Your balance: </span>
                <span className="font-semibold" style={{ color: user.credit_balance >= finalTotal ? "var(--success)" : "var(--error)" }}>
                  {user.credit_balance.toLocaleString("tr-TR")} ₺
                </span>
              </div>
            )}

            <Link
              href={`/cart/checkout${couponResult?.valid ? `?coupon=${couponCode}` : ""}`}
              className="btn btn-accent w-full mt-6"
            >
              Proceed to Checkout
            </Link>

            <p className="text-xs text-center mt-3" style={{ color: "var(--text-muted)" }}>
              {cart.subtotal < 1500 ? `Add ${(1500 - cart.subtotal).toLocaleString("tr-TR")} ₺ more for free shipping` : "✓ Free shipping applied"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
