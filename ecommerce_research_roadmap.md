# E-Commerce Research Data Collection Platform — Full Roadmap (A → Z)

A complete plan to build a tech-gadget e-commerce site whose primary purpose is to capture **demographic** and **sequential behavioral** data for research, using AI models to accelerate development.

---

## 1. Project Vision & Success Criteria

**Goal:** Ship a functional e-commerce simulation that produces clean, joinable research datasets (demographic + sequential events).

**Success criteria**
- Every registered user produces a `customer_id` and a complete demographic row.
- Every interaction produces a sequential event row joinable by `customer_id` + `session_id`.
- Datasets export to CSV/Parquet with no schema drift.
- The site is publicly reachable, mobile-friendly, and stable for at least 100 concurrent test users.
- All 19 sequential fields and 11 demographic fields are populated correctly per the spec.

**Non-goals:** Real payments, real inventory, real shipping. Everything is simulated with the 12,000 TL credit wallet.

---

## 2. High-Level Architecture

```
┌──────────────────────────┐      ┌──────────────────────────┐
│  Frontend (Next.js +     │ ───▶ │  Backend API (FastAPI    │
│  TypeScript + Tailwind)  │ ◀─── │  or Node/Express)        │
│  - Pages, cart, profile  │      │  - Auth, products, cart  │
│  - Event tracker SDK     │      │  - Segmentation engine   │
└──────────┬───────────────┘      └──────────┬───────────────┘
           │                                 │
           │ POST /events (batched)          │
           ▼                                 ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│  Event Ingestion         │      │  PostgreSQL (Supabase)   │
│  (FastAPI route or       │ ───▶ │  - users, products       │
│  Kafka-lite queue)       │      │  - sessions, events      │
└──────────────────────────┘      │  - orders, carts         │
                                  └──────────┬───────────────┘
                                             │
                                             ▼
                                  ┌──────────────────────────┐
                                  │  Research Export Layer   │
                                  │  - CSV / Parquet dumps   │
                                  │  - Jupyter / Pandas      │
                                  └──────────────────────────┘
```

**Recommended stack**
- **Frontend:** Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui + Zustand (cart state).
- **Backend:** FastAPI (Python) — best fit because your research downstream is Python/Pandas. Alternative: Node.js + Express if you prefer a single language.
- **Database:** PostgreSQL via Supabase (free tier, built-in auth, row-level security, instant REST).
- **Auth:** Supabase Auth (email/password) — saves weeks vs. rolling your own.
- **Hosting:** Vercel (frontend) + Render/Railway/Fly.io (backend) + Supabase (DB).
- **Analytics export:** Python notebook + `psycopg2` / `sqlalchemy` → CSV/Parquet.

---

## 3. Logical Structure & Data Model

### 3.1 Database tables

**`users`** (mirrors demographic schema)
| column | type | notes |
|---|---|---|
| customer_id | uuid PK | generated on signup |
| email | text unique | |
| password_hash | text | from Supabase Auth |
| age_group | text | derived from raw age |
| gender | text | M / F |
| raw_city | text | original input |
| city_tier | text | derived |
| account_age_days | int | derived from `last_online_purchase_date` |
| lifetime_order_count | int | derived |
| total_order_value | numeric | derived |
| avg_order_value | numeric | derived |
| loyalty_tier | text | derived |
| preferred_device | text | inferred from User-Agent on signup |
| payment_method_saved | bool | yes/no answer |
| last_purchase_date | date | from signup question |
| credit_balance | numeric | default 12000.00 |
| created_at | timestamptz | |

**`products`**
- product_id, name, category, price, discount_rate, image_urls (jsonb), description, stock_simulated, avg_rating, review_count.

**`reviews`**
- review_id, product_id FK, customer_id FK, rating (1–5), text, created_at.

**`sessions`**
- session_id PK, customer_id FK, started_at, ended_at, user_agent, abandonment_status.

**`events`** (the sequential dataset — one row per event)
- event_id, session_id FK, customer_id FK, event_timestamp, event_type, page_url, product_id (nullable), time_on_page_sec, product_price, discount_rate, scroll_depth_pct, review_section_visited, images_viewed_count, back_button_count, cart_total_at_event, items_in_cart, exit_intent_triggered, cart_add_remove_count, search_bar_used, coupon_applied, shipping_fee, abandonment_status.

**`carts`** and **`cart_items`** — current cart state per user.

**`orders`** and **`order_items`** — finalized purchases (deducts from credit_balance).

**`coupons`** — code, discount_pct, valid_from/until, usage_limit.

### 3.2 Segmentation logic (applied at signup)

Implement as a single backend function `compute_segments(form_input) -> demographic_row`:

```python
def compute_segments(form):
    # Age group
    age = form["age"]
    if 18 <= age <= 24: age_group = "18-24"
    elif 25 <= age <= 34: age_group = "25-34"
    elif 35 <= age <= 44: age_group = "35-44"
    else: age_group = "45+"

    # City tier
    tier1 = {"Istanbul","Ankara","Izmir","Baku"}
    tier2 = {"Kocaeli","Edirne","Sivas"}
    tier3 = {"Bolu","Igdir","Rize"}
    city = form["city"]
    if city in tier1: city_tier = "Tier-1"
    elif city in tier2: city_tier = "Tier-2"
    elif city in tier3: city_tier = "Tier-3"
    else: city_tier = "Tier-3"  # fallback

    # account_age_days
    account_age_days = (today - form["last_online_purchase_date"]).days

    # lifetime_order_count
    freq = form["monthly_shopping_frequency"]
    if freq == 0: lifetime_order_count = 0
    elif freq < 5: lifetime_order_count = random.randint(0, 5)
    else: lifetime_order_count = random.randint(5, 20)

    # total & avg order value
    total_order_value = sum(random.randint(700, 3000) for _ in range(lifetime_order_count))
    avg_order_value = total_order_value / lifetime_order_count if lifetime_order_count else 0

    # loyalty tier (suggested thresholds — tune for your research)
    if total_order_value < 5000: loyalty_tier = "Bronze"
    elif total_order_value < 15000: loyalty_tier = "Silver"
    elif total_order_value < 30000: loyalty_tier = "Gold"
    else: loyalty_tier = "Platinum"

    # payment_method_saved
    payment_method_saved = (form["save_card"] == "yes")

    # preferred_device — parse User-Agent header
    preferred_device = parse_device(request.headers["User-Agent"])

    return {...}
```

> **Note:** Your spec lists `total_order_value` twice (as #6) — I treated it as a separate field above. Keep both `total_order_value` and `avg_order_value` in the demographic table; export only the columns required by your research schema.

### 3.3 Sequential event tracking — what fires where

| event_type | Triggered by | Page |
|---|---|---|
| `view` | Page load + product card hover ≥1s | Shop, product detail |
| `add_to_cart` | "Add to cart" click | Product detail |
| `remove_from_cart` | "Remove" click | Cart |
| `checkout_start` | "Checkout" click | Cart |
| `coupon_search` | Promo input focus | Cart |
| `review_section_visit` | Scroll into reviews div | Product detail |

**Per-event metadata to capture client-side**
- `time_on_page_sec`: timer started on route enter, sent on route exit/event.
- `scroll_depth_pct`: max scroll position / document height.
- `images_viewed_count`: increment on gallery thumbnail clicks.
- `back_button_count`: listen to `popstate`.
- `exit_intent_triggered`: `mouseleave` toward viewport top.
- `search_bar_used`: flag flips true on first search submit per session.
- `coupon_applied`: flag flips true when a valid code applies.
- `cart_total_at_event` / `items_in_cart` / `cart_add_remove_count` / `shipping_fee`: read from cart state at fire time.
- `abandonment_status`: written at session close — true if no `order_completed` event in session.

---

## 4. Project Phases & Timeline (≈ 5–7 weeks solo, faster with AI pair-programming)

### Phase 0 — Setup (Day 1–2)
- Create GitHub repo (monorepo with `/frontend`, `/backend`, `/research`).
- Set up Supabase project, get DB URL + anon key.
- Configure ESLint, Prettier, Black, Ruff, pre-commit hooks.
- Create `.env.example` for both apps.
- Decide on commit conventions (Conventional Commits).

### Phase 1 — Database & Backend Skeleton (Week 1)
- Write SQL migrations for all tables (use Supabase migrations or Alembic).
- Seed `products` with ~60 tech gadgets across 6+ categories (phones, laptops, headphones, smartwatches, cameras, accessories) — generate with an LLM.
- Seed coupon codes.
- Build auth endpoints: `/auth/signup`, `/auth/login`, `/auth/me`.
- Build segmentation function + unit tests (pytest with table-driven cases).
- Build CRUD endpoints: `/products`, `/products/:id`, `/cart`, `/orders`, `/reviews`.
- Build event ingestion: `POST /events` (batched, accepts array).

### Phase 2 — Frontend Pages (Week 2–3)
- **Onboarding form:** age, gender, city, monthly frequency, last online purchase date, save-card preference.
- **Shop page:** 5-column grid, category filter sidebar, sort dropdown (price asc/desc, rating, newest).
- **Product card:** name, price (with discount strike-through), star rating.
- **Product detail page:** image gallery, description, add-to-cart button, scrollable review section, "write review" form.
- **Cart page:** modify quantities, remove items, promo code input, "save for later" toggle, checkout button.
- **Profile page:** show all demographic fields, credit balance, **explanation panel** showing how each segment was computed (very important for your research — transparency).
- **Top menu:** logo, Shop, About Us, Cart (with badge), Profile.

### Phase 3 — Event Tracking SDK (Week 3)
Build a lightweight client-side tracker `lib/tracker.ts`:
- Initializes session on first page load (`session_id = uuid()`).
- Exposes `track(eventType, payload)`.
- Maintains running counters (back_button_count, cart_add_remove_count, etc.).
- Buffers events and flushes every 5s or on `beforeunload` via `navigator.sendBeacon`.
- Wraps Next.js router events for automatic `view` and `time_on_page_sec`.

### Phase 4 — Cart, Checkout, Wallet (Week 4)
- Cart state in Zustand, persisted to backend.
- Checkout flow: validate balance ≥ cart total + shipping, deduct credit, create `order`, clear cart, fire `order_completed` event.
- Promo code validation endpoint.
- Shipping fee logic (e.g., free over 1500 TL, else 50 TL).

### Phase 5 — Profile Transparency Page (Week 4)
- Show raw inputs vs. derived fields side-by-side.
- Explain each rule in plain language (good for participant trust + IRB/ethics compliance).

### Phase 6 — Testing (Week 5)
- **Unit tests:** segmentation logic, coupon validation, balance deduction.
- **Integration tests:** full signup → browse → add-to-cart → checkout flow with `pytest` + `httpx`.
- **E2E tests:** Playwright scripts for onboarding, shopping, checkout, abandonment.
- **Load test:** `k6` or `locust` — simulate 100 concurrent sessions to confirm event ingestion holds up.
- **Data validation:** script that pulls events table and asserts every row has all 19 fields non-null where required.

### Phase 7 — Deployment (Week 5–6)
- Frontend → Vercel (auto-deploy from `main`).
- Backend → Render or Railway (Dockerfile + health check).
- DB → Supabase (already cloud).
- Custom domain + HTTPS (Vercel handles automatically).
- Environment secrets in each platform's dashboard.
- Set up Sentry for error tracking, Logtail/Axiom for logs.

### Phase 8 — Ethics, Consent, Pilot (Week 6)
- **Consent screen** before onboarding: explain that interactions are recorded for research, what fields are stored, that data is anonymized, right to withdraw.
- IRB / institutional ethics approval if required by your university.
- Privacy policy + terms page.
- Pilot with 5–10 users, fix bugs, validate data quality.

### Phase 9 — Data Collection & Export (Week 6–7)
- Recruit participants (social media, university mailing list, Prolific, etc.).
- Monitor dashboard: signups/day, events/day, abandonment rate.
- Weekly export Jupyter notebook:
  - `demographic.csv` — one row per user.
  - `sequential.csv` / `sequential.parquet` — one row per event.
  - Schema validation report.

---

## 5. AI Models — Where Each One Helps Most

| Task | Recommended model / tool | Why |
|---|---|---|
| Architecture review, schema design, tricky algorithms | Claude Opus 4.7 or GPT-5.5 | Strong reasoning on system design |
| Day-to-day code generation (components, endpoints) | Claude Sonnet 4.6 | Fast, high-quality code |
| Boilerplate (forms, tables, types) | GPT-5.4-mini or Gemini 3 Flash | Cheap and fast |
| UI design + Tailwind layouts | Claude Sonnet 4.6 with screenshots | Best for translating mockups to JSX |
| Generating 60 product seed data rows (names, descriptions, prices) | Any frontier model with JSON output | One-shot, just ask for JSON |
| Test case generation | Claude Sonnet 4.6 | Good at edge cases |
| SQL migration writing & review | GPT-5.4 | Solid SQL fluency |
| Debugging stack traces | Whichever you're already using | Paste trace + relevant file |

**Prompting workflow tips**
1. Always paste the **schema** (DB tables + TypeScript types) into the system prompt — keeps generations consistent.
2. Use one chat per feature, not one mega-chat — keeps context clean.
3. For the segmentation engine: write the test cases first with AI, then ask AI to make them pass. Catches off-by-one errors in age/tier bins.
4. For the event tracker: have AI generate the type definitions from your spec table first, then build around them.

---

## 6. File / Repo Structure

```
ecommerce-research/
├── frontend/                 # Next.js
│   ├── app/
│   │   ├── (auth)/onboarding/page.tsx
│   │   ├── shop/page.tsx
│   │   ├── product/[id]/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── profile/page.tsx
│   │   └── about/page.tsx
│   ├── components/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── tracker.ts        # event SDK
│   │   └── store.ts          # Zustand
│   └── types/
├── backend/                  # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── products.py
│   │   │   ├── cart.py
│   │   │   ├── orders.py
│   │   │   ├── events.py
│   │   │   └── reviews.py
│   │   ├── services/
│   │   │   ├── segmentation.py
│   │   │   └── coupons.py
│   │   ├── models/           # SQLAlchemy
│   │   └── schemas/          # Pydantic
│   ├── migrations/
│   ├── tests/
│   └── seed/
│       ├── products.json
│       └── seed.py
├── research/
│   ├── exports/              # CSVs go here
│   ├── notebooks/
│   │   ├── 01_export.ipynb
│   │   ├── 02_validation.ipynb
│   │   └── 03_eda.ipynb
│   └── schemas/              # JSON schema files
├── docs/
│   ├── consent.md
│   ├── privacy.md
│   └── data-dictionary.md
└── README.md
```

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Event loss on tab close | Use `navigator.sendBeacon` + server-side session-end sweeper |
| Bot signups polluting data | Add hCaptcha on onboarding + manual review filter |
| Low traffic = thin dataset | Recruit via Prolific (paid) for guaranteed N |
| Schema drift between code and exports | Pydantic models = single source of truth, generate TS types from them |
| Segmentation rules change mid-study | Version the segmentation function (`segmentation_v1`, `v2`) and store version on each user row |
| Privacy / GDPR if EU participants | Anonymize, store no real PII beyond email, allow deletion requests |
| Random fields make data non-reproducible | Seed `random` per `customer_id` so the same user always gets the same derived values |

---

## 8. Definition of Done (Launch Checklist)

- [ ] All 30 spec fields populated correctly in DB.
- [ ] Onboarding → shop → product → cart → checkout → order works end-to-end.
- [ ] Profile page shows segments and explanations.
- [ ] Event tracker fires all 6 event types and persists 19 fields per row.
- [ ] CSV export script runs cleanly and passes schema validation.
- [ ] Consent + privacy pages live.
- [ ] 100-user load test passes.
- [ ] Sentry + logging wired up.
- [ ] Pilot with 5 users completed and data inspected.
- [ ] Custom domain live with HTTPS.

---

## 9. Suggested 6-Week Calendar

| Week | Focus |
|---|---|
| 1 | DB schema, backend skeleton, auth, segmentation engine + tests |
| 2 | Onboarding form, shop page, product detail page |
| 3 | Cart, profile, checkout, event tracker SDK |
| 4 | Reviews, coupons, polish, end-to-end tests |
| 5 | Deployment, load testing, consent flow, pilot |
| 6 | Recruit participants, monitor, weekly exports, iterate |

---

## 10. Immediate Next Steps (Today)

1. Create the GitHub monorepo with the structure in §6.
2. Spin up Supabase project, run the SQL migrations from §3.1.
3. Have an AI model generate `products.json` seed data (60 rows of tech gadgets, JSON schema you provide).
4. Stand up the FastAPI skeleton with `/health` + `/auth/signup` and the segmentation function.
5. Stub the Next.js app with the onboarding form wired to `/auth/signup`.

Once those five are done, the rest is iterative feature work.
