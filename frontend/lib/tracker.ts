/**
 * Event Tracking SDK — client-side behavioral data collection.
 *
 * Implements §3.3 of the roadmap:
 * - Initializes session on first page load (session_id = uuid)
 * - Exposes track(eventType, payload) 
 * - Maintains running counters (back_button, cart_add_remove, etc.)
 * - Buffers events and flushes every 5s or on beforeunload via sendBeacon
 * - Wraps Next.js router events for automatic view + time_on_page_sec
 */

import { v4 as uuidv4 } from "uuid";
import type { EventType, TrackingEvent, SessionCounters } from "@/types/events";

const FLUSH_INTERVAL_MS = 5000;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class Tracker {
  private sessionId: string = "";
  private buffer: TrackingEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private pageEnteredAt: number = 0;
  private maxScrollDepth: number = 0;
  private initialized: boolean = false;

  // ── Running session counters ─────────────────────────────────────
  public counters: SessionCounters = {
    back_button_count: 0,
    cart_add_remove_count: 0,
    images_viewed_count: 0,
    search_bar_used: false,
    coupon_applied: false,
    exit_intent_triggered: false,
    review_section_visited: false,
  };

  /**
   * Initialize the tracker. Call once on app mount.
   */
  init(): void {
    if (this.initialized || typeof window === "undefined") return;

    let existingSession = sessionStorage.getItem("tracker_session_id_v2");
    if (!existingSession) {
      existingSession = uuidv4();
      sessionStorage.setItem("tracker_session_id_v2", existingSession);
    }
    // Always register session on backend to ensure it exists across DB wipes or user changes
    this.registerSession(existingSession);
    this.sessionId = existingSession;

    // Start page timer
    this.pageEnteredAt = Date.now();

    // Scroll depth tracking
    window.addEventListener("scroll", this.handleScroll, { passive: true });

    // Exit intent detection (mouse leaving toward top)
    document.addEventListener("mouseleave", this.handleExitIntent);

    // Back button tracking
    window.addEventListener("popstate", this.handlePopState);

    // Flush on tab close
    window.addEventListener("beforeunload", this.handleBeforeUnload);

    // Periodic flush
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);

    this.initialized = true;
  }

  /**
   * Clean up listeners. Call on app unmount.
   */
  destroy(): void {
    if (!this.initialized) return;
    this.flush();

    window.removeEventListener("scroll", this.handleScroll);
    document.removeEventListener("mouseleave", this.handleExitIntent);
    window.removeEventListener("popstate", this.handlePopState);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);

    if (this.flushTimer) clearInterval(this.flushTimer);
    this.initialized = false;
  }

  /**
   * Track an event. Core API for the SDK.
   */
  track(
    eventType: EventType,
    extra: Partial<TrackingEvent> = {}
  ): void {
    if (!this.sessionId) return;

    const cartState = this.getCartState();

    const event: TrackingEvent = {
      session_id: this.sessionId,
      event_type: eventType,
      page_url: typeof window !== "undefined" ? window.location.pathname : null,
      product_id: null,
      time_on_page_sec: this.getTimeOnPage(),
      product_price: null,
      discount_rate: null,
      scroll_depth_pct: this.maxScrollDepth,
      review_section_visited: this.counters.review_section_visited,
      images_viewed_count: this.counters.images_viewed_count,
      back_button_count: this.counters.back_button_count,
      cart_total_at_event: cartState.total,
      items_in_cart: cartState.itemCount,
      exit_intent_triggered: this.counters.exit_intent_triggered,
      cart_add_remove_count: this.counters.cart_add_remove_count,
      search_bar_used: this.counters.search_bar_used,
      coupon_applied: this.counters.coupon_applied,
      shipping_fee: cartState.shippingFee,
      abandonment_status: null,
      ...extra,
    };

    this.buffer.push(event);
  }

  /**
   * Called on route change — fires view event for new page + resets timers.
   */
  onRouteChange(url: string): void {
    // Fire view event for the new page
    this.track("view", { page_url: url });
    // Reset page-level counters
    this.pageEnteredAt = Date.now();
    this.maxScrollDepth = 0;
    this.counters.review_section_visited = false;
  }

  /**
   * Increment image view count (call on gallery thumbnail click).
   */
  incrementImageViews(): void {
    this.counters.images_viewed_count++;
  }

  /**
   * Increment cart add/remove count.
   */
  incrementCartAction(): void {
    this.counters.cart_add_remove_count++;
  }

  /**
   * Mark search bar as used.
   */
  markSearchUsed(): void {
    this.counters.search_bar_used = true;
  }

  /**
   * Mark coupon as applied.
   */
  markCouponApplied(): void {
    this.counters.coupon_applied = true;
  }

  recordRemoveFromCart(item: any, cartTotalAfter: number, itemsAfter: number) {
    this.incrementCartAction();
    this.track('remove_from_cart', {
      product_id: item.product_id,
      product_price: item.price,
      discount_rate: item.discount_rate,
      quantity_removed: item.quantity,
      cart_total_at_event: cartTotalAfter,
      items_in_cart: itemsAfter,
    });
  }

  markCouponSearched(
    trigger: 'focus' | 'apply',
    payload: {
      code_attempted?: string;
      apply_success?: boolean;
      discount_amount?: number;
      cart_total_at_event: number;
      items_in_cart: number;
    }
  ) {
    this.track('coupon_search', { trigger, ...payload });
    if (trigger === 'apply' && payload.apply_success) {
      this.markCouponApplied();
    }
  }

  /**
   * Mark review section as visited.
   */
  markReviewVisited(): void {
    this.counters.review_section_visited = true;
  }

  // ── Private methods ──────────────────────────────────────────────

  private async registerSession(sessionId: string): Promise<void> {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      await fetch(`${API_URL}/events/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_agent: navigator.userAgent,
        }),
      });
    } catch {
      // Silent fail — don't break the app
    }
  }

  private getTimeOnPage(): number {
    return Math.round((Date.now() - this.pageEnteredAt) / 1000);
  }

  private getCartState(): { total: number; itemCount: number; shippingFee: number } {
    // Read from Zustand store if available (via window state)
    try {
      const storeState = (window as any).__CART_STATE__;
      if (storeState) {
        return {
          total: storeState.total || 0,
          itemCount: storeState.itemCount || 0,
          shippingFee: storeState.shippingFee || 0,
        };
      }
    } catch {}
    return { total: 0, itemCount: 0, shippingFee: 0 };
  }

  private handleScroll = (): void => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      const depth = Math.round((scrollTop / docHeight) * 100);
      this.maxScrollDepth = Math.max(this.maxScrollDepth, depth);
    }

    // Check if review section is visible
    const reviewSection = document.getElementById("reviews");
    if (reviewSection) {
      const rect = reviewSection.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        if (!this.counters.review_section_visited) {
          this.counters.review_section_visited = true;
          this.track("review_section_visit");
        }
      }
    }
  };

  private handleExitIntent = (e: MouseEvent): void => {
    if (e.clientY <= 0 && !this.counters.exit_intent_triggered) {
      this.counters.exit_intent_triggered = true;
    }
  };

  private handlePopState = (): void => {
    this.counters.back_button_count++;
  };

  private handleBeforeUnload = (): void => {
    this.flush(true);
  };

  /**
   * Send buffered events to the backend.
   */
  private flush(useBeacon = false): void {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    const token = localStorage.getItem("access_token");
    if (!token) return;

    const payload = JSON.stringify({ events });

    // sendBeacon cannot set custom headers (like Authorization), so we must use fetch with keepalive
    fetch(`${API_URL}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Re-buffer on failure
      this.buffer.push(...events);
    });
  }
}

// Singleton instance
const tracker = new Tracker();
export default tracker;
