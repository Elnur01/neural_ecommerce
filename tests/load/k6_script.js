import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users for 1 min
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users for 1 min
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000';

export default function () {
  const uniqueId = __VU + '-' + __ITER + '-' + Date.now();
  
  // 1. Signup Flow
  const signupPayload = JSON.stringify({
    email: `testuser-${uniqueId}@research.dev`,
    password: 'password123',
    age: Math.floor(Math.random() * (60 - 18 + 1)) + 18,
    gender: Math.random() > 0.5 ? 'M' : 'F',
    city: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya'][Math.floor(Math.random() * 5)],
    monthly_shopping_frequency: Math.floor(Math.random() * 10),
    last_online_purchase_date: '2026-04-10',
    save_card: Math.random() > 0.5 ? 'yes' : 'no',
  });

  const signupRes = http.post(`${BASE_URL}/auth/signup`, signupPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(signupRes, {
    'signup successful': (r) => r.status === 201,
  });

  if (signupRes.status !== 201) return; // Exit early if signup fails

  const token = signupRes.json('access_token');
  const authHeaders = {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
  };

  sleep(1);

  // 2. Browse Products
  const productsRes = http.get(`${BASE_URL}/products?page=1&page_size=10`);
  check(productsRes, {
    'products loaded': (r) => r.status === 200,
  });

  const products = productsRes.json('products');
  if (!products || products.length === 0) return;

  const targetProduct = products[0];

  sleep(2);

  // 3. Add to Cart
  const cartPayload = JSON.stringify({
    product_id: targetProduct.product_id,
    quantity: 1,
  });

  const cartRes = http.post(`${BASE_URL}/cart/items`, cartPayload, authHeaders);
  check(cartRes, {
    'added to cart': (r) => r.status === 200,
  });

  sleep(1);

  // 4. Fire Batched Events (SDK simulation)
  const session_id = `sess-${uniqueId}`;
  const eventsPayload = JSON.stringify({
    events: [
      {
        session_id: session_id,
        event_timestamp: new Date().toISOString(),
        event_type: 'view',
        page_url: '/',
        time_on_page_sec: 5.2,
      },
      {
        session_id: session_id,
        event_timestamp: new Date().toISOString(),
        event_type: 'add_to_cart',
        page_url: `/product/${targetProduct.product_id}`,
        product_id: targetProduct.product_id,
        product_price: targetProduct.price,
        time_on_page_sec: 12.5,
      }
    ]
  });

  const eventsRes = http.post(`${BASE_URL}/events`, eventsPayload, authHeaders);
  check(eventsRes, {
    'events ingested': (r) => r.status === 200,
  });

  sleep(1);

  // 5. Checkout (Using coupon to test full logic flow)
  // To avoid balance issues across thousands of loops, we will just use the default 12,000 credit
  // and ensure we don't exceed it with our one small product purchase.
  const orderPayload = JSON.stringify({
    coupon_code: 'WELCOME10', // 10% discount
  });

  const orderRes = http.post(`${BASE_URL}/orders`, orderPayload, authHeaders);
  // We check for 200 (Success) or 400 (Insufficient Balance if the product was too expensive)
  check(orderRes, {
    'checkout processed': (r) => r.status === 200 || r.status === 400,
  });

  sleep(1);
}
