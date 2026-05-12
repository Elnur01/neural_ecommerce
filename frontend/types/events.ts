/**
 * Event type definitions — mirrors the 19-field sequential dataset spec from §3.3.
 */

export type EventType =
  | "view"
  | "add_to_cart"
  | "remove_from_cart"
  | "checkout_start"
  | "coupon_search"
  | "review_section_visit"
  | "order_completed"
  | "survey_page_loaded"
  | "exit_intent_shown"
  | "exit_intent_dismissed"
  | "exit_intent_accepted"
  | "scenario_recall_modal_opened";

export interface TrackingEvent {
  session_id: string;
  event_type: EventType;
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
  abandonment_status: boolean | null;
  quantity_removed?: number;
  trigger?: string;
  code_attempted?: string;
  apply_success?: boolean;
  discount_amount?: number;
}

export interface SessionCounters {
  back_button_count: number;
  cart_add_remove_count: number;
  images_viewed_count: number;
  search_bar_used: boolean;
  coupon_applied: boolean;
  exit_intent_triggered: boolean;
  review_section_visited: boolean;
}
