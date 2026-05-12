# Neural E-Commerce — Realistic Simulation Roadmap v4

**Document type:** Handover specification for the incoming engineering team
**Research goal:** Draw defensible conclusions about *when and why real shoppers abandon* an e-commerce site
**Date:** 2026-05-09
**Version:** v4 — handover-ready, all open questions resolved
**Owner:** Feyruz Sultanli (researcher)

---

## 0. Document purpose

This is the canonical specification for the incoming team. It supersedes all prior versions (v1, v2, v3). Read sections 1–3 first for full context, then implement work packages in the order listed in §11.

---

## 1. Locked architectural decisions

These are final. Do not revisit during implementation.

| Decision | Value |
|---|---|
| **Database** | PostgreSQL, managed via Supabase (existing) |
| **Object storage (product images)** | Supabase Storage (existing) |
| **Auth** | Supabase Auth (existing) |
| **Frontend** | Next.js (existing) |
| **Backend** | FastAPI (existing) |
| **Error monitoring** | Sentry — researcher has 1-year free trial with quotas (50K errors, 5GB logs, 5M spans, 500 replays, 1 cron monitor) sufficient for the entire study |
| **Custom domain** | To be purchased on Day 0 — see §1.1 below |
| **Tracker SDK style** | Keep existing named-method API; add two new named methods (`recordRemoveFromCart`, `markCouponSearched`); no refactor |
| **Existing data** | Clean wipe of `users`, `sessions`, `events`, `orders`, `cart_items`, `reviews`. Keep `products` (will be updated by WP-3). |
| **Pilot size** | 10 users |
| **Recruitment channel** | University network |
| **Lottery incentive** | 5 × 200 TRY Hepsiburada gift cards (~1,000 TRY total) — researcher has budget |
| **Site language** | Bilingual (English + Turkish), browser-detected default with manual toggle |
| **Duplicate signups** | Tolerated, not blocked. Capture `device_fingerprint` for analysis-time filtering |

> **Note on Appwrite:** A future migration to Appwrite is on the researcher's roadmap but **out of scope for this stage**. Do not introduce Appwrite into any code or schema for this study.

### 1.1 Domain recommendation

Researcher does not currently own a domain. Buy one on **Day 0** before any deployment work.

**Recommended:** [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) at-cost pricing — `.com` for **~$10.44/year** with no markup, free WHOIS privacy, free DNS. ([Cloudflare Registrar review 2026](https://emelia.io/pt/hub/domain-registrars))

**Alternative:** [Namecheap](https://www.namecheap.com/domains/) — `.com` from **~$8.88 first year**, renews ~$18.48. ([Namecheap pricing 2026](https://blog.webhostmost.com/namecheap-review-2026/))

**Avoid:** free `.tk` / `.xyz` / `.gq` — they look untrustworthy to participants and lower realism scores.
**Avoid for now:** `.com.tr` — requires Turkish company tax ID and runs ~$80/year.

Suggested name pattern: short, neutral, study-evocative. Pick one before deployment.

---

## 2. Why this redesign exists

The platform was originally built with a flat 12,000 TRY budget for every user, uniform pricing, no scenario priming, and no abandonment instrumentation beyond a binary flag. Pilot testing showed users treating the credit as house money — abandonment rates were artificially low and behaviorally uninformative.

This roadmap closes the gap between "test data with the right schema" and "research data that supports defensible claims about online shopping abandonment in a Turkish population." The seven work packages introduce variance in the predictor space (intent, budget pressure, price sensitivity, visual engagement) and self-reported labels for every session.

---

## 3. Predictors of abandonment — coverage matrix

| Predictor (per literature) | Pre-redesign | Post-redesign | Source |
|---|---|---|---|
| Cart value vs. budget | Flat budget | Variable budgets | WP-2 |
| Price shock / sticker shock | Uniform | Wide range 150–80,000 TRY | WP-3 |
| Visual engagement | No images | Up to 3 images/product, tracked | WP-7 |
| Coupon-hunting behavior | Untracked | Full event coverage | WP-1 |
| Cart edit churn | Remove untracked | Both add and remove tracked | WP-1 |
| Purchase intent | Unknown | Scenario assignment + survey | WP-4 |
| Mission completion | Unknown | 3-layer mission tracking | WP-4 |
| Time pressure | None | "Only chance" framing | WP-5 |
| Self-reported abandonment reason | None | Post-session survey | WP-6 |

---

## 4. Work packages — at a glance

| # | Package | Effort | Research impact |
|---|---|---|---|
| WP-1 | Close `remove_from_cart` and `coupon_search` tracking gaps | 1–2 h | Critical |
| WP-2 | Variable budgets tied to age × loyalty tier | 3–4 h | High |
| WP-3 | Realistic price range across products (150–80,000 TRY) | 2–3 h + content work | High |
| WP-4 | Pre-task scenario prompt + persistence + mission tracking | 4–5 h | Very high |
| WP-5 | "Only chance" framing + lottery incentive | 1–2 h | High |
| WP-6 | Abandonment-stage funnel labels + post-session survey | 4–6 h | Very high |
| WP-7 | Product image management (Supabase Storage, up to 3 per product) | 3–4 h | High |

**Total: ~17–25 hours of focused engineering.**

---

## 5. WP-1 — Close the two tracking gaps

**Critical, do first.** Your existing `lib/tracker.ts` already has named methods (`incrementCartAction`, `markCouponApplied`). Add two more named methods alongside them. Do not refactor to a generic API.

### 5.1 Add to `frontend/lib/tracker.ts`

```ts
recordRemoveFromCart(item: CartItem, cartTotalAfter: number, itemsAfter: number) {
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
```

### 5.2 Wire into UI

**`frontend/app/cart/page.tsx`** — on remove button click, BEFORE state update:

```ts
tracker.recordRemoveFromCart(
  item,
  cartTotal - item.price * item.quantity,
  items.length - 1
);
```

**Promo input on /cart:**

```tsx
<input
  onFocus={() =>
    tracker.markCouponSearched('focus', {
      cart_total_at_event: cartTotal,
      items_in_cart: items.length,
    })
  }
  ...
/>

<button
  onClick={async () => {
    const result = await applyCoupon(code);
    tracker.markCouponSearched('apply', {
      code_attempted: code,
      apply_success: result.ok,
      discount_amount: result.discount ?? 0,
      cart_total_at_event: cartTotal,
      items_in_cart: items.length,
    });
  }}
>
  Apply
</button>
```

### 5.3 Validation

Add to `02_validation.ipynb`:

```python
assert (events.event_type == 'remove_from_cart').sum() > 0, "no remove events"
assert (events.event_type == 'coupon_search').sum() > 0, "no coupon events"
```

---

## 6. WP-2 — Variable budgets tied to age × loyalty tier

### 6.1 The budget matrix

Replace the flat 12,000 TRY with a 4×4 matrix sampled at signup. Values reflect realistic disposable income for Turkish online shoppers. Sample uniformly within each cell to add within-segment variance.

| Age \ Loyalty | Bronze | Silver | Gold | Platinum |
|---|---|---|---|---|
| 18-24 | 3,000 – 6,000 | 4,000 – 8,000 | 6,000 – 10,000 | 8,000 – 14,000 |
| 25-34 | 5,000 – 9,000 | 7,000 – 12,000 | 10,000 – 18,000 | 15,000 – 25,000 |
| 35-44 | 6,000 – 11,000 | 9,000 – 15,000 | 13,000 – 22,000 | 20,000 – 35,000 |
| 45+ | 5,000 – 10,000 | 8,000 – 14,000 | 12,000 – 20,000 | 18,000 – 30,000 |

### 6.2 Implementation — `backend/app/services/segmentation.py`

```python
import random

BUDGET_MATRIX = {
    ("18-24", "Bronze"):   (3000, 6000),   ("18-24", "Silver"):   (4000, 8000),
    ("18-24", "Gold"):     (6000, 10000),  ("18-24", "Platinum"): (8000, 14000),
    ("25-34", "Bronze"):   (5000, 9000),   ("25-34", "Silver"):   (7000, 12000),
    ("25-34", "Gold"):     (10000, 18000), ("25-34", "Platinum"): (15000, 25000),
    ("35-44", "Bronze"):   (6000, 11000),  ("35-44", "Silver"):   (9000, 15000),
    ("35-44", "Gold"):     (13000, 22000), ("35-44", "Platinum"): (20000, 35000),
    ("45+",   "Bronze"):   (5000, 10000),  ("45+",   "Silver"):   (8000, 14000),
    ("45+",   "Gold"):     (12000, 20000), ("45+",   "Platinum"): (18000, 30000),
}

def assign_budget(customer_id: str, age_group: str, loyalty_tier: str) -> float:
    rng = random.Random(customer_id)  # reproducible
    low, high = BUDGET_MATRIX[(age_group, loyalty_tier)]
    return round(rng.uniform(low, high), 2)
```

### 6.3 Schema additions

```sql
ALTER TABLE users ADD COLUMN credit_balance_initial NUMERIC NOT NULL;
ALTER TABLE users ADD COLUMN budget_matrix_version TEXT NOT NULL DEFAULT 'v1';
-- credit_balance is the running balance
-- credit_balance_initial is the starting one (needed for budget-utilization analysis)
```

### 6.4 Profile page transparency

The /profile page must show this exact pattern:

> Your budget of **14,250 TRY** was assigned based on your age group **(25–34)** and loyalty tier **(Gold)**, reflecting average disposable income for Turkish online shoppers in this segment.

Without this transparency, participants may distrust the simulation and behave erratically.

### 6.5 Unit tests required

Cover all 16 cells of the matrix. Verify `assign_budget` is deterministic for the same `customer_id`.

---

## 7. WP-3 — Realistic price range across products

### 7.1 Target distribution (60+ products)

| Band | Range (TRY) | Approx count | Categories |
|---|---|---|---|
| Micro | 150 – 800 | 12 | Cables, adapters, basic earbuds, phone cases, screen protectors |
| Low | 800 – 3,000 | 14 | Mid earbuds, basic smartwatches, power banks, mice/keyboards |
| Mid | 3,000 – 10,000 | 14 | Premium headphones, mid smartwatches, tablets, monitors |
| High | 10,000 – 30,000 | 12 | Phones, laptops, premium watches, cameras |
| Premium | 30,000 – 80,000 | 8 | Flagship phones, gaming laptops, professional cameras |

### 7.2 Pricing realism rules

- Use **real May 2026 Turkish market prices** from hepsiburada.com, trendyol.com, vatanbilgisayar.com.
- Discount distribution across catalog: 30% of products at 0%, 40% at 5–15%, 20% at 20–35%, 10% at 40–60%.
- Mark 6–8 products as "limited stock" with `stock_remaining` ∈ [3, 7].
- Mark 4–6 products with `discount_ends_at` within 24 hours.

### 7.3 Schema additions

```sql
ALTER TABLE products ADD COLUMN stock_remaining INT;
ALTER TABLE products ADD COLUMN discount_ends_at TIMESTAMPTZ;
```

### 7.4 Pricing workflow (collaborative with researcher)

The researcher will provide actual prices for products you cannot price reliably. Workflow:

1. **Audit existing ~50 products.** Generate `products_audit.csv` with columns: `product_id, name, current_price, current_band, target_band_needed`.
2. **Identify gaps.** Compare current distribution to §7.1 targets. Output a list of 10–15 new products to add (mostly Micro and Premium ends).
3. **Price-fetch attempt.** Use public retailer pages to fetch current prices for known SKUs. Output `prices_fetched.csv`.
4. **Manual fill-in.** Anything you cannot reliably price goes into `prices_to_confirm.csv` for the researcher to fill from hepsiburada/trendyol.
5. **Migration.** Single SQL migration brings all products to confirmed prices.
6. **Distribution audit.** Histogram check confirms band counts match §7.1 within ±2 per band.

### 7.5 Frontend touches

- "Son **3** adet" / "Only **3** left" badge when `stock_remaining < 5`.
- Countdown timer when `discount_ends_at` is within 24h.

---

## 8. WP-4 — Pre-task scenario prompt + persistence + mission tracking

This package is the highest-leverage change in the entire study. It converts the platform from observational to quasi-experimental by introducing a between-subjects manipulation of purchase intent.

### 8.1 The four scenarios — bilingual

Detect language from `navigator.language`: default to Turkish for `tr-*`, English otherwise. Provide a toggle button on the scenario page.

#### Scenario A — Replacement need (high intent)

🇬🇧 **EN:**
> Your old phone broke yesterday. You need to replace it within the next few days because you can't function at work without one. You have **[BUDGET] TRY** available from this month's budget. Browse the store and decide what to buy.

🇹🇷 **TR:**
> Eski telefonunuz dün bozuldu. İşinizi yapabilmeniz için birkaç gün içinde yenisini almanız gerekiyor. Bu ayki bütçenizden **[BUDGET] TL** ayırabiliyorsunuz. Mağazayı gezin ve ne alacağınıza karar verin.

#### Scenario B — Considered upgrade (medium intent)

🇬🇧 **EN:**
> You've been thinking about upgrading your laptop for a few months. It still works but feels slow. You have **[BUDGET] TRY** set aside that you could spend on this — or save for later. Browse the store and decide whether anything is worth buying today.

🇹🇷 **TR:**
> Birkaç aydır dizüstü bilgisayarınızı yenilemeyi düşünüyorsunuz. Hâlâ çalışıyor ama yavaşladı. Bu iş için ayırdığınız **[BUDGET] TL** var — bugün harcayabilir ya da ileriye saklayabilirsiniz. Mağazayı gezin ve bugün almaya değer bir şey var mı karar verin.

#### Scenario C — Gift shopping (other-directed)

🇬🇧 **EN:**
> Your sibling's birthday is next week. You want to buy them a tech gift. Your budget is **[BUDGET] TRY**. They like music and gaming. Browse the store and decide what to buy — or whether to keep looking elsewhere.

🇹🇷 **TR:**
> Kardeşinizin doğum günü önümüzdeki hafta. Ona teknolojik bir hediye almak istiyorsunuz. Bütçeniz **[BUDGET] TL**. Müzik ve oyun seviyor. Mağazayı gezin ve ne alacağınıza karar verin — ya da başka yerlere bakmaya devam edin.

#### Scenario D — Just browsing (low intent / control)

🇬🇧 **EN:**
> You have a few minutes free and you're casually browsing a tech store. You have **[BUDGET] TRY** available but no specific need. Look around and buy something only if it genuinely catches your interest.

🇹🇷 **TR:**
> Boş birkaç dakikanız var ve teknoloji mağazasında geziyorsunuz. **[BUDGET] TL** bütçeniz var ama belirli bir ihtiyacınız yok. Etrafa bakın ve sadece gerçekten ilgi çekici bir şey görürseniz alın.

### 8.2 Schema for scenario persistence

```sql
ALTER TABLE users ADD COLUMN scenario_id            TEXT NOT NULL;
ALTER TABLE users ADD COLUMN scenario_label         TEXT NOT NULL;
ALTER TABLE users ADD COLUMN scenario_intent_level  TEXT NOT NULL;  -- 'high' | 'medium' | 'other_directed' | 'low'
ALTER TABLE users ADD COLUMN scenario_text_shown    TEXT NOT NULL;  -- exact text rendered, with budget filled
ALTER TABLE users ADD COLUMN scenario_text_lang     TEXT NOT NULL;  -- 'en' | 'tr'
ALTER TABLE users ADD COLUMN scenario_text_version  TEXT NOT NULL DEFAULT 'v1';
ALTER TABLE users ADD COLUMN scenario_acknowledged_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN scenario_read_time_sec INT;
ALTER TABLE users ADD COLUMN device_fingerprint    TEXT;            -- for duplicate detection without blocking

ALTER TABLE events   ADD COLUMN scenario_id TEXT;                   -- denormalized for analysis
ALTER TABLE sessions ADD COLUMN scenario_id TEXT;
ALTER TABLE sessions ADD COLUMN scenario_recall_correct BOOLEAN;
ALTER TABLE sessions ADD COLUMN mission_alignment_score FLOAT;
ALTER TABLE sessions ADD COLUMN mission_completed_inferred BOOLEAN;
```

We store `scenario_text_shown` verbatim because if wording changes later, we don't lose what previous participants read.

### 8.3 Three-layer mission tracking

**Layer 1 — Behavioral inference (automatic).** Compute `mission_alignment_score` (0–1) at session end:

```python
EXPECTED_CATEGORIES = {
    'A_replacement': ['phones'],
    'B_upgrade':     ['laptops', 'monitors'],
    'C_gift':        ['headphones', 'audio', 'wearables', 'gaming'],
    'D_browse':      None,  # any browsing acceptable
}

def compute_mission_alignment(session, scenario_id):
    if scenario_id == 'D_browse':
        return 1.0 if session.event_count > 5 else 0.5
    expected = EXPECTED_CATEGORIES[scenario_id]
    visited = set(session.unique_categories_visited)
    overlap = len(set(expected) & visited) / max(len(expected), 1)
    purchased = session.completed_purchase
    in_target = purchased and (session.purchased_category in expected)
    if in_target:                  return 1.0
    if purchased and not in_target: return 0.3
    if overlap > 0:                return 0.5 + 0.3 * overlap
    return 0.2
```

Set `mission_completed_inferred = (mission_alignment_score >= 0.7)`.

**Layer 2 — Self-report.** Asked in WP-6 post-session survey: "Did you complete the task we gave you?" plus "In your own words, what was your shopping task?" (free text).

**Layer 3 — Mid-task recall check.** One-shot modal triggered by **whichever fires first**: 5 minutes on /shop OR first add-to-cart event.

```ts
let recallShown = false;
const timer = setTimeout(showRecall, 5 * 60 * 1000);
function onAddToCart() {
  if (!recallShown) showRecall();
}
function showRecall() {
  if (recallShown) return;
  recallShown = true;
  clearTimeout(timer);
  // show modal: "Quick reminder — what was your task?"
  // 4 options matching the 4 scenarios; correct answer flips scenario_recall_correct = true
}
```

### 8.4 Scenario assignment — deterministic by customer_id

```ts
const SCENARIOS = ['A_replacement', 'B_upgrade', 'C_gift', 'D_browse'];
const idx = hashStringToInt(user.customer_id) % 4;
const scenario_id = SCENARIOS[idx];
```

Use a stable hash (e.g. djb2, or `parseInt(md5(customer_id).slice(0,8), 16)`).

**Fallback if pilot shows imbalance** (any arm < 15% or > 35% of total): switch to round-robin via a `scenario_counter` table. Keep the deterministic-hash code as primary.

### 8.5 The /scenario page

```tsx
// frontend/app/scenario/page.tsx
const SCENARIOS = ['A_replacement', 'B_upgrade', 'C_gift', 'D_browse'];

export default function ScenarioPage() {
  const user = useUser();
  const [lang, setLang] = useState<'tr'|'en'>(detectLang());
  const scenarioId = SCENARIOS[hashStringToInt(user.customer_id) % 4];
  const cfg = SCENARIO_CONFIG[scenarioId];
  const renderedText = cfg.text[lang].replace(
    '[BUDGET]',
    user.credit_balance_initial.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')
  );

  const [readStartedAt] = useState(Date.now());
  const [canContinue, setCanContinue] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCanContinue(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const handleContinue = async () => {
    const readTimeSec = Math.floor((Date.now() - readStartedAt) / 1000);
    await api.post('/scenario/acknowledge', {
      scenario_id: scenarioId,
      scenario_label: cfg.label[lang],
      scenario_intent_level: cfg.intent_level,
      scenario_text_shown: renderedText,
      scenario_text_lang: lang,
      scenario_text_version: 'v1',
      scenario_read_time_sec: readTimeSec,
    });
    router.push('/shop');
  };

  return ( /* render scenario, lang toggle, 8s-gated continue button */ );
}
```

### 8.6 Persistent scenario banner

Top of /shop, /product/[id], /cart:

```tsx
<ScenarioBanner>
  {lang === 'tr' ? 'Göreviniz' : 'Your task'}: {scenario_label} ·
  {lang === 'tr' ? 'Bütçe' : 'Budget'}: {credit_balance_initial.toLocaleString()} TRY
  <button onClick={openScenarioModal}>
    {lang === 'tr' ? 'Tam metni göster' : 'Show full task'}
  </button>
</ScenarioBanner>
```

Clicking "Show full task" opens a modal with the original text and fires event `scenario_recall_modal_opened`.

### 8.7 Profile page — scenario section

Show on /profile:

> **Your Research Scenario**
> You were assigned the **"Replacement need"** scenario, which simulates needing to buy a phone urgently. Your assigned budget reflects the spending capacity of a 25–34 year-old Gold-tier shopper.
> [Show full scenario text]

### 8.8 Anti-cheating safeguards

- 8-second minimum read time on /scenario before "Continue" enabled.
- Persistent banner keeps task salient.
- Mid-task recall check.
- Self-report at end.

### 8.9 `device_fingerprint` (duplicate-tolerance, not blocking)

Compute client-side at signup:

```ts
const fingerprint = sha256(
  navigator.userAgent +
  `${screen.width}x${screen.height}` +
  Intl.DateTimeFormat().resolvedOptions().timeZone +
  navigator.language
);
```

Sent on signup, stored in `users.device_fingerprint`. Same person re-registering with another email is allowed; analyst flags duplicates by matching fingerprint at export time.

---

## 9. WP-5 — "Only chance" framing + lottery

### 9.1 Copy (bilingual)

1. **Scenario page footer** —
   EN: *"This is a one-time session. Any credits you don't spend are lost. Anything you buy is yours in the simulation."*
   TR: *"Bu tek seferlik bir oturumdur. Harcamadığınız krediler kaybolur. Aldığınız her şey simülasyon içinde sizin olur."*

2. **Shop page banner** —
   EN: *"Single session — make it count."*
   TR: *"Tek oturum — iyi değerlendirin."*

3. **Exit-intent modal** (mouseleave toward viewport top with non-empty cart) —
   EN: *"You have items in your cart and **[X] TRY** of unused budget. Are you sure you want to leave?"*
   TR: *"Sepetinizde ürünler var ve **[X] TL** harcanmamış bütçeniz var. Çıkmak istediğinizden emin misiniz?"*

### 9.2 Lottery

Add to /consent:

EN: *"Five participants who complete the study (including the post-session survey) will be randomly selected to receive a 200 TRY Hepsiburada gift card."*
TR: *"Çalışmayı (oturum sonrası anket dahil) tamamlayan katılımcılar arasından rastgele seçilen 5 kişiye 200 TL'lik Hepsiburada hediye kartı verilecektir."*

Schema:

```sql
ALTER TABLE users ADD COLUMN lottery_eligible BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN contact_email_for_lottery TEXT;
```

Operationalization: at study close, run `ORDER BY RANDOM() LIMIT 5` over completed-survey participants.

### 9.3 Implementation

- Build `<ExitIntentModal />`, mount on /shop, /product/[id], /cart.
- Listen for `mouseleave` toward `e.clientY <= 0`.
- Show at most once per session.
- Track event `exit_intent_shown` when displayed; `exit_intent_dismissed` if user clicks "stay".

---

## 10. WP-6 — Abandonment instrumentation + post-session survey

### 10.1 New event types (add to existing 7)

| event_type | Trigger |
|---|---|
| `cart_view` | /cart loaded |
| `checkout_abandoned` | Was on /cart/checkout, navigated away without completing |
| `exit_intent_shown` | Exit modal displayed |
| `exit_intent_dismissed` | User clicked "stay" on exit modal |
| `session_end` | beforeunload + 30-min idle timeout |
| `scenario_recall_modal_opened` | Banner click |
| `scenario_recall_check` | Mid-task recall answered (correct/incorrect logged) |
| `product_image_viewed` | Gallery thumbnail clicked (see WP-7) |

### 10.2 Granular abandonment labels

Replace binary `abandonment_status` with categorical `abandonment_stage`:

| Value | Meaning |
|---|---|
| `completed` | Order placed |
| `abandoned_browse` | Left without adding anything to cart |
| `abandoned_cart` | Added to cart, never reached checkout |
| `abandoned_checkout` | Reached checkout, didn't complete |
| `abandoned_payment` | Started checkout submission, didn't finish |

Computed at `session_end` by inspecting the session's event stream.

### 10.3 Post-session survey (8 questions, bilingual)

Triggered after `order_completed` OR after `exit_intent_dismissed=false` (real exit). Hosted at `/debrief`.

1. *Did you intend to buy something when you started this session?* (Yes definitely / Maybe / No just browsing)
2. *Did you complete a purchase?* (Yes / No)
3. *(If no purchase) Main reason?* (Prices too high / Couldn't find what I wanted / Wanted to compare with other sites / Shipping/delivery concerns / Changed my mind / Got distracted / Other [text])
4. **Did you complete the task we gave you?** (Yes fully / Yes partially / No, I went off-task / I forgot the task)
5. **In your own words, what was your shopping task?** (free text)
6. *How realistic did the scenario feel?* (1–7 Likert)
7. *How realistic did the overall shopping experience feel?* (1–7 Likert)
8. *Anything else you want to tell us?* (free text, optional)

### 10.4 Schema

```sql
CREATE TABLE post_session_survey (
  survey_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(customer_id),
  session_id UUID REFERENCES sessions(session_id),
  scenario_id TEXT,
  survey_lang TEXT,
  intent_to_buy TEXT,
  completed_purchase BOOLEAN,
  abandonment_reason TEXT,
  abandonment_reason_other TEXT,
  mission_completed_self_report TEXT,
  mission_recall_text TEXT,
  scenario_realism_score INT CHECK (scenario_realism_score BETWEEN 1 AND 7),
  overall_realism_score INT CHECK (overall_realism_score BETWEEN 1 AND 7),
  free_text TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 11. WP-7 — Product image management (Supabase Storage)

### 11.1 Why this matters

Activates the existing `images_viewed_count` field (currently meaningless because there's nothing to view) and adds a new `product_image_viewed` event for visual-engagement analysis.

### 11.2 Supabase Storage setup

```
Bucket name: product-images
Visibility: public read
File size limit: 1 MB (we resize client-side to <200 KB)
Allowed MIME: image/jpeg, image/png, image/webp
```

Path convention:

```
product-images/{product_id}/{slot}.webp
e.g. product-images/abc123/1.webp
     product-images/abc123/2.webp
     product-images/abc123/3.webp
```

Slot 1 = primary (card thumbnail). Slots 2–3 = gallery.

### 11.3 Schema

```sql
ALTER TABLE products ADD COLUMN image_count INT DEFAULT 0;
ALTER TABLE products ADD COLUMN image_urls JSONB DEFAULT '[]'::jsonb;
-- image_urls = ordered array of public Supabase Storage URLs
```

### 11.4 Admin upload page — `/admin/products`

Gate behind hardcoded admin email (`feyruzsultanli@gmail.com`) check on the backend.

**Frontend:**
- Lists all products with thumbnail + current image count badge.
- Drag-and-drop area accepts up to 3 files per product.
- Validates types (jpg/png/webp) and count (≤3).
- **Client-side resize** to max 1200×1200 using HTML canvas.
- **Client-side WebP conversion** with target ≤200 KB.
- Uploads to Supabase Storage at `{product_id}/{slot}.webp` with upsert.
- Calls backend to update `image_urls` and `image_count`.

**Backend endpoint:**

```python
@router.post("/admin/products/{product_id}/images")
async def upload_product_image(
    product_id: str,
    slot: int,                  # 1, 2, or 3
    public_url: str,            # already uploaded by frontend
    current_user = Depends(require_admin),
):
    if slot not in (1, 2, 3):
        raise HTTPException(400, "slot must be 1, 2, or 3")
    # Replace URL at slot N (slots are 1-indexed in array position)
    await db.execute("""
        UPDATE products
        SET image_urls = jsonb_set(
              COALESCE(image_urls, '[]'::jsonb),
              ARRAY[(:slot - 1)::text],
              to_jsonb(:url::text),
              true
            ),
            image_count = (
              SELECT COUNT(*) FROM jsonb_array_elements(
                jsonb_set(
                  COALESCE(image_urls, '[]'::jsonb),
                  ARRAY[(:slot - 1)::text],
                  to_jsonb(:url::text),
                  true
                )
              )
            )
        WHERE product_id = :pid
    """, {"slot": slot, "url": public_url, "pid": product_id})
    return {"ok": True}
```

### 11.5 Frontend — gallery + image-view tracking

**Product card (shop page):** show only `image_urls[0]`. No tracking here — viewing the card thumbnail isn't a meaningful engagement signal.

**Product detail page:**

```tsx
const [activeIdx, setActiveIdx] = useState(0);
const viewedSet = useRef(new Set([0]));   // slot 0 considered viewed on page load

const handleThumbnailClick = (idx: number) => {
  setActiveIdx(idx);
  if (!viewedSet.current.has(idx)) {
    viewedSet.current.add(idx);
    tracker.incrementImageView();
    tracker.track('product_image_viewed', {
      product_id: product.id,
      image_index: idx,
      total_images: product.image_urls.length,
    });
  }
};
```

Tracker addition:

```ts
incrementImageView() {
  this.sessionState.images_viewed_count += 1;
}
```

### 11.6 Image acquisition (researcher's task, no rush)

Researcher will manually upload images. Suggested approach:

1. Open `/admin/products`. See product list with image-count badges.
2. For each product, find 1–3 official press images from manufacturer sites.
3. Drag-and-drop. Auto-resize + WebP conversion happens client-side.
4. Three-shot pattern: front view (slot 1), angle/side (slot 2), in-use/detail (slot 3).
5. Plan ~3–5 minutes per product × 60 products = **3–5 hours** in one focused batch (or split across days).
6. Save originals to `product_images_raw/{product_id}/` before any processing.

### 11.7 Validation

```python
products = pd.read_sql("SELECT * FROM products", conn)
assert (products.image_count >= 1).all(), "every product needs ≥1 image"
assert (products.image_count <= 3).all(), "max 3 images per product"
print(f"Avg images/product: {products.image_count.mean():.2f}")
```

### 11.8 Launch fallback

Until upload is complete: ship a generic placeholder image (`/public/placeholder.webp`). Profile/analysis filters can exclude sessions where every viewed product had `image_count = 0`.

---

## 12. Consolidated segmentation function

This is the canonical signup-time segmentation — implement in `backend/app/services/segmentation.py`. Every derived value is seeded by `customer_id` for reproducibility.

```python
import random, hashlib
from datetime import date

SCENARIOS = ['A_replacement', 'B_upgrade', 'C_gift', 'D_browse']
SCENARIO_CONFIG = {
    'A_replacement': {'label': {'en': 'Replacement need',  'tr': 'Acil ihtiyaç'},     'intent_level': 'high',           'text': {'en': '...', 'tr': '...'}},
    'B_upgrade':     {'label': {'en': 'Considered upgrade','tr': 'Planlı yükseltme'}, 'intent_level': 'medium',         'text': {'en': '...', 'tr': '...'}},
    'C_gift':        {'label': {'en': 'Gift shopping',     'tr': 'Hediye alışverişi'},'intent_level': 'other_directed', 'text': {'en': '...', 'tr': '...'}},
    'D_browse':      {'label': {'en': 'Just browsing',     'tr': 'Sadece geziyorum'}, 'intent_level': 'low',            'text': {'en': '...', 'tr': '...'}},
}

TIER1 = {"Istanbul", "Ankara", "Izmir", "Baku"}
TIER2 = {"Kocaeli", "Edirne", "Sivas"}
TIER3 = {"Bolu", "Igdir", "Rize"}

LOYALTY_THRESHOLDS = [
    (5000,         "Bronze"),
    (15000,        "Silver"),
    (30000,        "Gold"),
    (float("inf"), "Platinum"),
]

def compute_segmentation(form: dict, customer_id: str, user_agent: str, lang: str) -> dict:
    rng = random.Random(customer_id)

    age = form["age"]
    age_group = ("18-24" if 18 <= age <= 24 else
                 "25-34" if 25 <= age <= 34 else
                 "35-44" if 35 <= age <= 44 else "45+")
    gender = form["gender"]

    city = form["city"].strip()
    city_tier = ("Tier-1" if city in TIER1 else
                 "Tier-2" if city in TIER2 else "Tier-3")

    account_age_days = (date.today() - form["last_online_purchase_date"]).days

    freq = form["monthly_shopping_frequency"]
    if freq == 0:
        lifetime_order_count = 0
    elif freq < 5:
        lifetime_order_count = rng.randint(0, 5)
    else:
        lifetime_order_count = rng.randint(5, 20)

    total_order_value = sum(rng.randint(700, 3000) for _ in range(lifetime_order_count))
    avg_order_value = (total_order_value / lifetime_order_count) if lifetime_order_count else 0

    loyalty_tier = next(label for thresh, label in LOYALTY_THRESHOLDS if total_order_value < thresh)

    # WP-2: variable budget
    low, high = BUDGET_MATRIX[(age_group, loyalty_tier)]
    credit_balance_initial = round(rng.uniform(low, high), 2)

    # WP-4: scenario assignment
    scenario_idx = int(hashlib.md5(customer_id.encode()).hexdigest(), 16) % 4
    scenario_id = SCENARIOS[scenario_idx]
    cfg = SCENARIO_CONFIG[scenario_id]
    scenario_text_shown = cfg['text'][lang].replace(
        '[BUDGET]', f"{credit_balance_initial:,.0f}"
    )

    return {
        "customer_id": customer_id,
        "age_group": age_group,
        "gender": gender,
        "raw_city": form["city"],
        "city_tier": city_tier,
        "account_age_days": account_age_days,
        "lifetime_order_count": lifetime_order_count,
        "total_order_value": total_order_value,
        "avg_order_value": round(avg_order_value, 2),
        "loyalty_tier": loyalty_tier,
        "preferred_device": parse_device(user_agent),
        "payment_method_saved": form["save_card"] == "yes",
        "last_purchase_date": form["last_online_purchase_date"],
        "credit_balance_initial": credit_balance_initial,
        "credit_balance": credit_balance_initial,
        "scenario_id": scenario_id,
        "scenario_label": cfg['label'][lang],
        "scenario_intent_level": cfg['intent_level'],
        "scenario_text_shown": scenario_text_shown,
        "scenario_text_lang": lang,
        "scenario_text_version": "v1",
        "budget_matrix_version": "v1",
        "segmentation_version": "v2",
    }
```

---

## 13. Final event schema (existing 19 + new fields)

| Existing 19 fields | Status |
|---|---|
| All 19 from current schema | Keep |

| New columns | Type | Source |
|---|---|---|
| `scenario_id` | text | Denormalized from users at write time |
| `abandonment_stage` | text | Replaces binary `abandonment_status` |
| `budget_utilization_pct` | float | `cart_total_at_event / credit_balance_initial × 100` |
| `time_since_session_start_sec` | float | Derived |
| `image_index` | int (nullable) | Only on `product_image_viewed` |
| `total_images_available` | int (nullable) | Only on `product_image_viewed` |

---

## 14. Implementation order — 11-day plan

| Day | Work | Output |
|---|---|---|
| Day 0 | Buy domain (Cloudflare Registrar `.com` ~$10/yr); set up Sentry projects (backend + frontend) | Domain + DSN secrets ready |
| Day 1 | Clean wipe migration; add all WP-2/4/5/6/7 schema columns | DB ready |
| Day 2 | WP-1 (tracking gaps) + Sentry SDK wired into backend & frontend | Bug-free baseline + monitoring |
| Day 3 | WP-7 part 1 (Supabase Storage bucket + admin upload page) | Image tooling ready for researcher |
| Day 4 | WP-3 part 1 (catalog audit + price-fetch script + gap list) | `prices_to_confirm.csv` for researcher |
| Day 5 | WP-3 part 2 (researcher fills prices, migration applied, distribution audit) | Realistic catalog live |
| Day 6 | WP-2 (variable budgets + 16-cell unit tests + profile transparency copy) | Budgets tied to demographics |
| Day 7 | WP-4 part 1 (scenario page bilingual + persistence + banner + lang toggle) | Scenarios assigned and stored |
| Day 8 | WP-4 part 2 (mid-task recall + mission alignment scoring) | Mission tracking complete |
| Day 9 | WP-5 + WP-6 part 1 (only-chance copy + exit-intent modal + abandonment_stage refactor + new event types) | Decision pressure + funnel labels |
| Day 10 | WP-6 part 2 (post-session survey bilingual + survey table + export script update) | Self-report labels live |
| Day 11 | Deploy to production (Vercel + Render/Railway), DNS for custom domain, smoke test full flow | Live URL on custom domain |
| Pilot week | 10-person pilot; researcher inspects data in `02_validation.ipynb`; bug-fix sprint | Pilot data validated |
| Recruitment | Open to university network in staggered batches | 80+ completed sessions |

WP-7 part 2 (manual image upload by researcher) can happen any time during or after this plan — not blocking.

---

## 15. Sentry wiring

The researcher's 1-year free Sentry trial covers 50K errors / 5GB logs / 5M spans / 500 replays / 1 cron monitor — generous enough to fully instrument both ends without sampling tradeoffs.

### 15.1 Backend (FastAPI)

```python
# backend/app/main.py
import os
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=os.environ["SENTRY_DSN_BACKEND"],
    integrations=[FastApiIntegration(), SqlalchemyIntegration()],
    traces_sample_rate=1.0,         # quotas allow 100%
    profiles_sample_rate=0.1,
    environment=os.environ.get("ENV", "production"),
    release=os.environ.get("GIT_SHA"),
    send_default_pii=False,         # research ethics
)
```

### 15.2 Frontend (Next.js)

```ts
// frontend/sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN_FRONTEND,
  tracesSampleRate: 0.5,
  replaysSessionSampleRate: 0.05,    // 5% of sessions
  replaysOnErrorSampleRate: 1.0,     // 100% of errored sessions
  integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: false })],
});
```

### 15.3 Cron monitor

Wire the daily CSV export script as a Sentry cron monitor — alerts if export ever fails.

### 15.4 PII safety

- `maskAllText: true` ensures session replays don't leak survey free-text or PII.
- `send_default_pii: false` prevents emails from going to Sentry.
- Set up an 80%-quota alert in Sentry settings as a precaution.

---

## 16. Recruitment plan

**Channels**
- University mailing list (request advisor / coordinator forward).
- Student WhatsApp / Discord groups in tech-leaning departments.
- Posters in CS / engineering / business buildings.
- Faculty announcement.

**Targets**
- 80+ completed sessions (20 per scenario arm).
- Over-recruit by ~20% (~100 signups) to account for partial completers.

**Timing**
- Do not open recruitment until Day 11 deployment + pilot are done.
- Announce in week-1 batches; do not blast everyone at once.

**Lottery operationalization**
- At study close: `SELECT * FROM users WHERE EXISTS (... completed_survey ...) ORDER BY RANDOM() LIMIT 5`.
- Email gift card codes within 7 days of close.

---

## 17. KVKK compliance — recommended consent paragraph

Add to /consent (bilingual). The researcher has taken responsibility for compliance; this paragraph makes that responsibility explicit and strengthens the ethics position.

🇬🇧 **EN:**
> *In accordance with the Turkish Personal Data Protection Law (KVKK No. 6698), demographic and behavioral data collected during this study is processed solely for academic research purposes. Data is anonymized at export, stored securely, and used only by the researcher named below. You may request deletion of your data at any time by contacting [feyruzsultanli@gmail.com]. Continuing past this screen constitutes informed consent under KVKK Article 5.*

🇹🇷 **TR:**
> *6698 Sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, bu çalışmada toplanan demografik ve davranışsal veriler yalnızca akademik araştırma amacıyla işlenmektedir. Veriler dışa aktarımda anonimleştirilir, güvenli şekilde saklanır ve yalnızca aşağıda adı belirtilen araştırmacı tarafından kullanılır. Verilerinizin silinmesini istediğiniz zaman [feyruzsultanli@gmail.com] adresinden talep edebilirsiniz. Bu ekrandan devam etmek, KVKK Madde 5 uyarınca aydınlatılmış onam vermek anlamına gelir.*

---

## 18. Launch checklist

Pre-launch (must pass before recruitment opens):

- [ ] Day 0 domain purchased and DNS pointed to Vercel
- [ ] Sentry DSNs in env, test error visible in dashboard for both backend and frontend
- [ ] Clean wipe migration applied (users / sessions / events / orders / cart_items / reviews truncated)
- [ ] All WP-2 / WP-4 / WP-5 / WP-6 / WP-7 schema columns added
- [ ] WP-1: `remove_from_cart` and `coupon_search` events confirmed in DB after manual test
- [ ] WP-2: 16-cell budget matrix unit tests pass
- [ ] WP-2: /profile shows budget derivation explanation
- [ ] WP-3: `prices_to_confirm.csv` populated by researcher; migration applied
- [ ] WP-3: Distribution audited within ±2 products per band
- [ ] WP-3: Limited-stock badges and discount countdowns visible
- [ ] WP-4: Scenarios bilingual; lang toggle working
- [ ] WP-4: 4 scenarios assigned roughly evenly across 20 test signups (chi-square p > 0.1)
- [ ] WP-4: Scenario banner persists on /shop, /product, /cart
- [ ] WP-4: 8-second minimum read time enforced on /scenario
- [ ] WP-4: Mid-task recall fires correctly (timer OR cart event, whichever first)
- [ ] WP-4: `mission_alignment_score` computed at session end
- [ ] WP-4: `device_fingerprint` recorded on signup
- [ ] WP-5: Exit-intent modal works on Chrome / Firefox / Safari
- [ ] WP-5: Lottery copy on /consent (bilingual)
- [ ] WP-6: All new event types fire correctly
- [ ] WP-6: `abandonment_stage` correctly labels test sessions across all 5 categories
- [ ] WP-6: Post-session survey submits and stores all 8 fields (bilingual)
- [ ] WP-7: Supabase Storage bucket configured; admin upload page works end-to-end
- [ ] WP-7: At least 1 image (or placeholder) for every product before launch
- [ ] WP-7: `images_viewed_count` increments on gallery clicks
- [ ] KVKK paragraph added to /consent (bilingual)
- [ ] 10-person pilot complete; data inspected in `02_validation.ipynb`

Post-launch nice-to-have:

- [ ] k6 load test (not a blocker — university recruitment never produces 100 concurrent users)

---

## 19. Validation queries (research-readiness check)

Run these after pilot. If any fail, stop and iterate before opening recruitment.

```sql
-- 1. Abandonment rate by scenario (expect monotonic ordering: A < B < C ≈ D)
SELECT u.scenario_intent_level,
       COUNT(*) AS sessions,
       AVG(CASE WHEN s.abandonment_stage='completed' THEN 0 ELSE 1 END) AS abandonment_rate
FROM sessions s JOIN users u USING (customer_id)
GROUP BY u.scenario_intent_level
ORDER BY CASE u.scenario_intent_level
  WHEN 'high' THEN 1 WHEN 'medium' THEN 2
  WHEN 'other_directed' THEN 3 WHEN 'low' THEN 4 END;

-- 2. Budget utilization distribution (should NOT cluster at 100%)
SELECT width_bucket(s.cart_total_max / u.credit_balance_initial * 100, 0, 100, 10) AS decile,
       COUNT(*)
FROM sessions s JOIN users u USING (customer_id)
GROUP BY decile ORDER BY decile;

-- 3. Mission alignment self-report vs. inferred agreement
SELECT pss.mission_completed_self_report,
       AVG(s.mission_alignment_score) AS avg_inferred_alignment,
       COUNT(*)
FROM post_session_survey pss JOIN sessions s USING (session_id)
GROUP BY pss.mission_completed_self_report;

-- 4. Image engagement vs. purchase
SELECT (SELECT MAX(images_viewed_count) FROM events e WHERE e.session_id = s.session_id) AS max_images_viewed,
       AVG(CASE WHEN s.abandonment_stage='completed' THEN 1 ELSE 0 END) AS purchase_rate
FROM sessions s GROUP BY 1 ORDER BY 1;

-- 5. Realism scores
SELECT AVG(scenario_realism_score) AS avg_scenario,
       AVG(overall_realism_score)  AS avg_overall,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY overall_realism_score) AS median_overall
FROM post_session_survey;

-- 6. Coupon search penetration
SELECT 100.0 * COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'coupon_search')
       / COUNT(DISTINCT session_id) AS pct_sessions_with_coupon_search
FROM events;
```

---

## 20. Risks + mitigations

| Risk | Mitigation |
|---|---|
| University recruitment skews young/tech | Stratify monitoring during pilot; reach out to staff/faculty if all participants are 18–24 |
| Bilingual translation quality | Native-speaker proofread of Turkish copy before launch |
| Sentry quota exceeded mid-study | Set 80%-quota alert; quotas are generous enough this is unlikely |
| Image upload still incomplete at launch | Placeholder fallback in WP-7.8; analysis filters can exclude empty-image products |
| `mission_alignment_score` heuristic miscalibrated | Cross-check against survey self-report during pilot; tune thresholds |
| Scenario imbalance from deterministic hash | Chi-square check at 20 signups; round-robin fallback ready |
| KVKK challenged by ethics board | §17 paragraph + faculty supervisor sign-off |
| Lottery legal/tax issues | 200 TRY × 5 stays well below Turkish gift-tax thresholds; documented in consent |
| Researcher unavailable to fill `prices_to_confirm.csv` | Engineering team can use approximate prices to unblock; researcher updates later via small follow-up migration |

---

## 21. The defensible claim this roadmap unlocks

> *"In a controlled simulation of Turkish online tech-gadget shopping (n=80+, 4 between-subjects scenarios spanning the purchase-intent spectrum, conducted in a Turkish university population), abandonment rate varied from X% (high-intent) to Y% (low-intent). Within scenarios, the strongest behavioral predictors of abandonment were budget utilization rate, coupon-search activity, and product-image engagement. Self-reported mission completion and behaviorally-inferred mission alignment correlated at r=Z, validating the scenario design. Data collection followed KVKK Article 5 informed-consent procedures."*

This is a complete, defensible research contribution. The pre-redesign platform could not support any of these claims.

---

## 22. Handover notes for the engineering team

- **Source of truth for segmentation:** §12. All 16 budget cells + 4 scenarios + reproducible RNG seeded by `customer_id`.
- **Source of truth for events:** §13. 19 existing fields + 6 new fields + 8 new event types.
- **Source of truth for schema:** §6.3, §7.3, §8.2, §9.2, §10.4, §11.3.
- **Implementation order:** §14 — strict dependency chain; do not reorder without flagging.
- **Researcher-blocking dependencies:** Day 5 (price confirmation) and WP-7 image upload. Both should be flagged early to keep the timeline.
- **Out of scope:** Appwrite migration, payment integration, real shipping, mobile native apps.
- **Contact for clarifications:** Feyruz Sultanli — feyruzsultanli@gmail.com

---

End of specification.
