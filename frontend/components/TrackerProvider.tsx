"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import tracker from "@/lib/tracker";
import { useCartStore, useAuthStore } from "@/lib/store";

/**
 * TrackerProvider — initializes the event tracking SDK and
 * bridges it with Next.js router events and Zustand cart state.
 *
 * Mount this once in the root layout.
 */
export default function TrackerProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { cart } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  // Initialize tracker on mount
  useEffect(() => {
    if (isAuthenticated()) {
      tracker.init();
    }
    return () => tracker.destroy();
  }, []);

  // Sync cart state to window for tracker access
  useEffect(() => {
    if (typeof window !== "undefined" && cart) {
      (window as any).__CART_STATE__ = {
        total: cart.total,
        itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
        shippingFee: cart.shipping_fee,
      };
    }
  }, [cart]);

  // Track route changes
  useEffect(() => {
    if (isAuthenticated()) {
      tracker.onRouteChange(pathname);
    }
  }, [pathname]);

  return <>{children}</>;
}
