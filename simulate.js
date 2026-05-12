const fetch = require("node-fetch");
const uuid = require("crypto").randomUUID;

const API_URL = "http://localhost:8000";

async function simulate() {
  console.log("🚀 Starting simulated test flow...");

  // 1. Create User
  const email = `test_sim_${Date.now()}@example.com`;
  console.log(`👤 Signing up as ${email}...`);
  const signupRes = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: "password123",
      age: 28,
      gender: "M",
      city: "Istanbul",
      monthly_shopping_frequency: 3,
      last_online_purchase_date: "2026-01-01",
      save_card: "yes"
    })
  });
  if (!signupRes.ok) throw new Error("Signup failed: " + await signupRes.text());
  
  // 2. Log in to get token
  const loginRes = await fetch(`${API_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `username=${encodeURIComponent(email)}&password=password123`
  });
  const { access_token } = await loginRes.json();
  console.log("✅ Authenticated!");

  // 3. Create Session
  const sessionId = uuid();
  console.log(`📝 Creating session ${sessionId}...`);
  const sessionRes = await fetch(`${API_URL}/events/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${access_token}`
    },
    body: JSON.stringify({ session_id: sessionId, user_agent: "Node.js Simulator" })
  });
  if (!sessionRes.ok) throw new Error("Session creation failed: " + await sessionRes.text());
  console.log("✅ Session registered in DB.");

  // 4. Send Events (simulating what tracker.ts does on close)
  console.log("📊 Sending 3 mock behavioral events...");
  const events = [
    {
      session_id: sessionId,
      event_type: "page_view",
      page_url: "/products",
      time_on_page_sec: 15,
      scroll_depth_pct: 100
    },
    {
      session_id: sessionId,
      event_type: "add_to_cart",
      page_url: "/products/123",
      time_on_page_sec: 45,
      cart_add_remove_count: 1
    },
    {
      session_id: sessionId,
      event_type: "checkout",
      page_url: "/cart",
      time_on_page_sec: 12,
      exit_intent_triggered: true
    }
  ];

  const eventsRes = await fetch(`${API_URL}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${access_token}`
    },
    body: JSON.stringify({ events })
  });
  
  if (!eventsRes.ok) throw new Error("Event ingestion failed: " + await eventsRes.text());
  console.log("✅ Events successfully ingested!");
}

simulate().catch(console.error);
