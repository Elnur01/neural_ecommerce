/* ═══════════════════════════════════════════════════════════════════
   TypeScript types — mirrors backend Pydantic schemas and DB models.
   ═══════════════════════════════════════════════════════════════════ */

// ── Auth ─────────────────────────────────────────────────────────
export interface SignupPayload {
  email: string;
  password: string;
  age: number;
  gender: "M" | "F";
  city: string;
  monthly_shopping_frequency: number;
  last_online_purchase_date: string; // ISO date string
  save_card: "yes" | "no";
  device_fingerprint?: string;
  lang?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  customer_id: string;
  email: string;
  age_group: string | null;
  gender: string | null;
  raw_city: string | null;
  city_tier: string | null;
  account_age_days: number;
  lifetime_order_count: number;
  total_order_value: number;
  avg_order_value: number;
  loyalty_tier: string;
  preferred_device: string | null;
  payment_method_saved: boolean;
  last_purchase_date: string | null;
  credit_balance: number;
  credit_balance_initial: number;
  raw_age: number | null;
  monthly_shopping_frequency: number;
  created_at: string | null;
  
  scenario_id?: string;
  scenario_label?: string;
  scenario_intent_level?: string;
  scenario_text_shown?: string;
  scenario_text_lang?: string;
  scenario_text_version?: string;
}

// ── Products ─────────────────────────────────────────────────────
export interface Product {
  product_id: string;
  name: string;
  category: string;
  price: number;
  discount_rate: number;
  image_urls: string[];
  description: string | null;
  stock_simulated: number;
  avg_rating: number;
  review_count: number;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  page_size: number;
}

// ── Cart ─────────────────────────────────────────────────────────
export interface CartItem {
  id: string;
  product_id: string;
  product_name: string | null;
  product_price: number | null;
  product_discount_rate: number | null;
  product_image_url: string | null;
  quantity: number;
}

export interface Cart {
  cart_id: string;
  items: CartItem[];
  subtotal: number;
  shipping_fee: number;
  total: number;
}

// ── Orders ───────────────────────────────────────────────────────
export interface OrderItem {
  product_id: string;
  product_name: string | null;
  product_image_url: string | null;
  quantity: number;
  unit_price: number;
}

export interface Order {
  order_id: string;
  total: number;
  shipping_fee: number;
  coupon_code: string | null;
  discount_amount: number;
  created_at: string | null;
  items: OrderItem[];
}

// ── Reviews ──────────────────────────────────────────────────────
export interface Review {
  review_id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  text: string | null;
  created_at: string | null;
}

// ── Coupons ──────────────────────────────────────────────────────
export interface CouponValidation {
  valid: boolean;
  discount_pct: number | null;
  message: string;
}
