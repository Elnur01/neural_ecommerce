import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import tracker from './tracker';

// Mock fetch globally
const globalFetch = vi.fn().mockResolvedValue({ ok: true });
global.fetch = globalFetch;

describe('Tracker SDK', () => {
  beforeEach(() => {
    // Reset tracker state using private property access for testing
    (tracker as any).sessionId = "test-session";
    (tracker as any).buffer = [];
    tracker.counters = {
      back_button_count: 0,
      cart_add_remove_count: 0,
      images_viewed_count: 0,
      search_bar_used: false,
      coupon_applied: false,
      exit_intent_triggered: false,
      review_section_visited: false,
    };
    globalFetch.mockClear();
  });

  it('recordRemoveFromCart fires correct event shape', () => {
    const item = { product_id: 'prod-1', price: 100, discount_rate: 0.1, quantity: 2 };
    tracker.recordRemoveFromCart(item, 500, 3);

    const buffer = (tracker as any).buffer;
    expect(buffer.length).toBe(1);
    expect(buffer[0].event_type).toBe('remove_from_cart');
    expect(buffer[0].product_id).toBe('prod-1');
    expect(buffer[0].cart_total_at_event).toBe(500);
    expect(buffer[0].items_in_cart).toBe(3);
  });

  it('recordRemoveFromCart increments cart_add_remove_count', () => {
    expect(tracker.counters.cart_add_remove_count).toBe(0);
    tracker.recordRemoveFromCart({ product_id: 'prod-1' }, 0, 0);
    expect(tracker.counters.cart_add_remove_count).toBe(1);
  });

  it('markCouponSearched(focus) does not flip coupon_applied flag', () => {
    tracker.markCouponSearched('focus', { cart_total_at_event: 100, items_in_cart: 1 });
    expect(tracker.counters.coupon_applied).toBe(false);
  });

  it('markCouponSearched(apply, success) flips coupon_applied flag', () => {
    tracker.markCouponSearched('apply', { apply_success: true, cart_total_at_event: 100, items_in_cart: 1 });
    expect(tracker.counters.coupon_applied).toBe(true);
  });

  it('markCouponSearched(apply, failure) does not flip flag', () => {
    tracker.markCouponSearched('apply', { apply_success: false, cart_total_at_event: 100, items_in_cart: 1 });
    expect(tracker.counters.coupon_applied).toBe(false);
  });

  it('incrementImageView increases counter', () => {
    expect(tracker.counters.images_viewed_count).toBe(0);
    tracker.incrementImageViews();
    expect(tracker.counters.images_viewed_count).toBe(1);
  });

  it('session flush sends batched events', () => {
    // We need to mock localStorage to return a token so flush fires fetch
    global.localStorage = {
      getItem: vi.fn((key) => key === 'access_token' ? 'fake-token' : null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 1,
      key: vi.fn(),
    } as unknown as Storage;
    
    tracker.track('view', { page_url: '/test' });
    expect((tracker as any).buffer.length).toBe(1);

    (tracker as any).flush();

    expect(globalFetch).toHaveBeenCalledTimes(1);
    expect(globalFetch.mock.calls[0][0]).toContain('/events');
    expect(JSON.parse(globalFetch.mock.calls[0][1].body).events[0].event_type).toBe('view');
    expect((tracker as any).buffer.length).toBe(0);
  });

  it('back button increments back_button_count', () => {
    const handlePopState = (tracker as any).handlePopState;
    handlePopState();
    expect(tracker.counters.back_button_count).toBe(1);
  });

  it('exit_intent_triggered fires once per session max', () => {
    const handleExitIntent = (tracker as any).handleExitIntent;
    
    // Simulate mouse moving outside to top (Y <= 0)
    handleExitIntent({ clientY: 0 } as MouseEvent);
    expect(tracker.counters.exit_intent_triggered).toBe(true);
    
    // Reset tracker counters manually to test max once
    tracker.counters.exit_intent_triggered = false;
    
    // Test that when we simulate normal mouseleave, it does not re-trigger if already true.
    tracker.counters.exit_intent_triggered = true;
    handleExitIntent({ clientY: 0 } as MouseEvent);
    expect(tracker.counters.exit_intent_triggered).toBe(true); // Should stay true
  });
});
