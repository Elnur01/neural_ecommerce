"""
LSTM Inference Service — SepetTerk v4 (BiLSTM + Attention + Cart-Exit Penalty)

Loads sepetterk_v4_best.pt and the replicated training CSVs once at startup
to fit the same StandardScaler / LabelEncoder parameters used during training.
Exposes a single public function:

    result = predict_abandonment(events, demographics)

Returns:
  {
    "abandonment_probability": float,         # 0.0 – 1.0
    "segment": str,                           # e.g. "price_sensitive"
    "segment_probabilities": {str: float},
    "should_intervene": bool,                 # True if prob >= threshold
    "cart_exit_detected": bool,               # True if left from cart/checkout
    "threshold_used": float,                  # 0.50 (cart-exit) or 0.70 (normal)
  }
"""

import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.preprocessing import LabelEncoder, StandardScaler

logger = logging.getLogger(__name__)

# ─── Model constants — must match v4 training script exactly ──────────────────
SEQ_FEATURES  = 15   # 5 event OHE + 10 numeric (no purchase/payment_attempt)
DEMO_FEATURES = 12   # 11 base + 1 left_from_cart
HIDDEN_SIZE   = 128
NUM_CLASSES   = 5
MAX_SEQ_LEN   = 20

# Adaptive thresholds
ABANDON_THRESHOLD_NORMAL    = 0.70
ABANDON_THRESHOLD_CART_EXIT = 0.50

CLASS_NAMES = [
    "price_sensitive",
    "needs_social_proof",
    "loyal_returner",
    "distracted",
    "comparison_shopping",
]

# v4 does NOT include purchase or payment_attempt (prevents leakage at inference)
EXPECTED_EVENT_COLS = [
    "et_add_to_cart", "et_checkout_start", "et_page_view",
    "et_product_view", "et_remove_from_cart",
]

NUM_SEQ_COLS = [
    "time_on_page_sec", "product_price", "discount_rate",
    "scroll_depth_pct", "review_section_visited", "images_viewed_count",
    "back_button_count", "cart_total_at_event", "items_in_cart",
    "exit_intent_triggered",
]

SEQ_COLS = EXPECTED_EVENT_COLS + NUM_SEQ_COLS   # 15 total

CAT_DEMO = ["age_group", "gender", "city_tier", "loyalty_tier", "preferred_device"]
NUM_DEMO = [
    "account_age_days", "lifetime_order_count", "avg_order_value",
    "payment_method_saved", "days_since_last_purchase", "avg_cart_value",
]
DEMO_COLS = CAT_DEMO + NUM_DEMO   # 11 base features

_DEMO_REF_DATE = pd.Timestamp("2025-01-01")

# Cart/checkout page URL patterns — navigating away from these = cart-exit signal
_CART_PAGE_PATTERNS = ["/cart", "/checkout", "/basket", "/order", "/payment"]


# ─── v4 Model Architecture ────────────────────────────────────────────────────

class _AttentionLayer(nn.Module):
    def __init__(self, hidden_size):
        super().__init__()
        self.attn = nn.Linear(hidden_size * 2, 1)

    def forward(self, lstm_out, seq_lengths):
        scores = self.attn(lstm_out).squeeze(-1)
        max_len = lstm_out.size(1)
        mask = (
            torch.arange(max_len, device=lstm_out.device).unsqueeze(0)
            >= seq_lengths.unsqueeze(1)
        )
        scores = scores.masked_fill(mask, float("-inf"))
        weights = torch.softmax(scores, dim=1)
        context = (weights.unsqueeze(-1) * lstm_out).sum(dim=1)
        return context, weights


class _SepetTerkModelV4(nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=SEQ_FEATURES,
            hidden_size=HIDDEN_SIZE,
            num_layers=2,
            batch_first=True,
            dropout=0.2,
            bidirectional=True,
        )
        self.attention  = _AttentionLayer(HIDDEN_SIZE)
        self.demo_embed = nn.Sequential(nn.Linear(DEMO_FEATURES, 32), nn.ReLU())
        combined = HIDDEN_SIZE * 2 + 32   # 288
        self.shared = nn.Sequential(
            nn.Linear(combined, 128), nn.ReLU(), nn.Dropout(0.4),
            nn.Linear(128, 64),       nn.ReLU(), nn.Dropout(0.3),
        )
        self.output_prob  = nn.Linear(64, 1)
        self.output_class = nn.Linear(64, NUM_CLASSES)

    def forward(self, seq_x, demo_x, seq_lengths):
        packed = nn.utils.rnn.pack_padded_sequence(
            seq_x, seq_lengths.cpu().clamp(min=1),
            batch_first=True, enforce_sorted=False,
        )
        lstm_out_packed, _ = self.lstm(packed)
        lstm_out, _ = nn.utils.rnn.pad_packed_sequence(
            lstm_out_packed, batch_first=True, total_length=MAX_SEQ_LEN
        )
        context, _  = self.attention(lstm_out, seq_lengths)
        demo_out    = self.demo_embed(demo_x)
        combined    = torch.cat([context, demo_out], dim=1)
        features    = self.shared(combined)
        return self.output_prob(features).squeeze(1), self.output_class(features)


# ─── Internal state ───────────────────────────────────────────────────────────

_model:          Optional[_SepetTerkModelV4] = None
_device:         torch.device                = torch.device("cpu")
_seq_scaler:     Optional[StandardScaler]   = None
_demo_scaler:    Optional[StandardScaler]   = None
_label_encoders: Dict[str, LabelEncoder]    = {}
_ready:          bool                       = False


def _initialize(checkpoint_path: str, sessions_csv: str, demographics_csv: str) -> None:
    global _model, _device, _seq_scaler, _demo_scaler, _label_encoders, _ready

    logger.info("LSTM v4 Inference: initializing from %s", checkpoint_path)

    # ── 1. Fit sequence scaler on training data ────────────────────────────────
    sess_raw = pd.read_csv(sessions_csv)
    sess_raw[NUM_SEQ_COLS] = sess_raw[NUM_SEQ_COLS].fillna(0.0)
    _seq_scaler = StandardScaler()
    _seq_scaler.fit(sess_raw[NUM_SEQ_COLS].values)

    # ── 2. Fit demo scaler + label encoders ───────────────────────────────────
    demo_raw = pd.read_csv(demographics_csv)
    demo = demo_raw.copy()

    demo["last_purchase_date"] = pd.to_datetime(demo["last_purchase_date"], errors="coerce")
    demo["days_since_last_purchase"] = (
        _DEMO_REF_DATE - demo["last_purchase_date"]
    ).dt.days.fillna(0)
    demo.drop(columns=["last_purchase_date"], inplace=True)

    if "avg_cart_value" not in demo.columns:
        demo["avg_cart_value"] = demo.get("avg_order_value", 0.0)

    _label_encoders = {}
    for col in CAT_DEMO:
        le = LabelEncoder()
        demo[col] = le.fit_transform(demo[col].astype(str))
        _label_encoders[col] = le

    _demo_scaler = StandardScaler()
    _demo_scaler.fit(demo[DEMO_COLS].fillna(0).values)

    # ── 3. Load model weights ──────────────────────────────────────────────────
    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    _model  = _SepetTerkModelV4().to(_device)
    _model.load_state_dict(
        torch.load(checkpoint_path, map_location=_device, weights_only=True)
    )
    _model.eval()

    _ready = True
    logger.info(
        "LSTM v4 Inference: ready (device=%s, checkpoint=%s)",
        _device, Path(checkpoint_path).name,
    )


def _ensure_ready() -> None:
    if _ready:
        return
    checkpoint   = os.getenv("LSTM_CHECKPOINT_PATH", "")
    sessions     = os.getenv("LSTM_SESSIONS_CSV", "")
    demographics = os.getenv("LSTM_DEMOGRAPHICS_CSV", "")
    if not checkpoint or not sessions or not demographics:
        raise RuntimeError(
            "LSTM service not initialized. Set LSTM_CHECKPOINT_PATH, "
            "LSTM_SESSIONS_CSV, and LSTM_DEMOGRAPHICS_CSV env vars."
        )
    _initialize(checkpoint, sessions, demographics)


def initialize(checkpoint_path: str, sessions_csv: str, demographics_csv: str) -> None:
    """Public entry point — call from FastAPI startup."""
    _initialize(checkpoint_path, sessions_csv, demographics_csv)


# ─── Cart-exit detection ──────────────────────────────────────────────────────

def _detect_cart_exit(events: List[Dict[str, Any]]) -> bool:
    """
    Returns True if the session shows a cart-exit signal:
      - exit_intent_triggered=True while items_in_cart > 0, OR
      - last event had items in cart but event_type is a navigation away, OR
      - any page_url matches checkout/cart patterns followed by another page
    """
    for ev in events:
        if ev.get("exit_intent_triggered") and float(ev.get("items_in_cart", 0) or 0) > 0:
            return True

    # Check if user was on a cart/checkout page in recent events
    for ev in events[-5:]:
        url = str(ev.get("page_url", "") or "").lower()
        if any(pattern in url for pattern in _CART_PAGE_PATTERNS):
            if float(ev.get("items_in_cart", 0) or 0) > 0:
                return True

    return False


# ─── Feature builders ─────────────────────────────────────────────────────────

def _build_seq_tensor(events: List[Dict[str, Any]]) -> tuple:
    """Convert event list to (1, MAX_SEQ_LEN, 15) tensor."""
    rows = []
    for ev in events[:MAX_SEQ_LEN]:
        et = str(ev.get("event_type", "") or "")
        # Skip purchase/payment events (same as training leakage removal)
        if et in ("purchase", "payment_attempt"):
            continue

        one_hot    = {col: 1.0 if col == f"et_{et}" else 0.0 for col in EXPECTED_EVENT_COLS}
        numeric    = {
            "time_on_page_sec":       float(ev.get("time_on_page_sec", 0) or 0),
            "product_price":          float(ev.get("product_price", 0) or 0),
            "discount_rate":          float(ev.get("discount_rate", 0) or 0),
            "scroll_depth_pct":       float(ev.get("scroll_depth_pct", 0) or 0),
            "review_section_visited": float(bool(ev.get("review_section_visited", False))),
            "images_viewed_count":    float(ev.get("images_viewed_count", 0) or 0),
            "back_button_count":      float(ev.get("back_button_count", 0) or 0),
            "cart_total_at_event":    float(ev.get("cart_total_at_event", 0) or 0),
            "items_in_cart":          float(ev.get("items_in_cart", 0) or 0),
            "exit_intent_triggered":  float(bool(ev.get("exit_intent_triggered", False))),
        }
        num_arr    = np.array([[numeric[c] for c in NUM_SEQ_COLS]], dtype=np.float32)
        num_scaled = _seq_scaler.transform(num_arr)[0]
        rows.append([one_hot[c] for c in EXPECTED_EVENT_COLS] + num_scaled.tolist())

    seq_len = max(len(rows), 1)
    if len(rows) < MAX_SEQ_LEN:
        rows += [[0.0] * SEQ_FEATURES] * (MAX_SEQ_LEN - len(rows))

    seq_t = torch.tensor(np.array(rows[:MAX_SEQ_LEN], dtype=np.float32)).unsqueeze(0)
    len_t = torch.tensor([seq_len], dtype=torch.long)
    return seq_t, len_t


def _build_demo_tensor(demographics: Dict[str, Any], cart_exit: bool) -> torch.Tensor:
    """Convert user profile dict to scaled (1, 12) tensor (11 base + left_from_cart)."""
    last_purchase = demographics.get("last_purchase_date")
    if last_purchase:
        try:
            lp = pd.Timestamp(str(last_purchase))
            days_since = max(0, (_DEMO_REF_DATE - lp).days)
        except Exception:
            days_since = 0
    else:
        days_since = 0

    avg_cart = demographics.get("avg_cart_value")
    if avg_cart is None:
        total = float(demographics.get("total_order_value", 0) or 0)
        count = float(demographics.get("lifetime_order_count", 0) or 1)
        avg_cart = total / count if count > 0 else 0.0

    demo_dict: Dict[str, Any] = {
        "age_group":               str(demographics.get("age_group", "unknown")),
        "gender":                  str(demographics.get("gender", "unknown")),
        "city_tier":               str(demographics.get("city_tier", "unknown")),
        "loyalty_tier":            str(demographics.get("loyalty_tier", "Bronze")),
        "preferred_device":        str(demographics.get("preferred_device", "unknown")),
        "account_age_days":        float(demographics.get("account_age_days", 0) or 0),
        "lifetime_order_count":    float(demographics.get("lifetime_order_count", 0) or 0),
        "avg_order_value":         float(demographics.get("avg_order_value", 0) or 0),
        "payment_method_saved":    float(bool(demographics.get("payment_method_saved", False))),
        "days_since_last_purchase": float(days_since),
        "avg_cart_value":          float(avg_cart),
    }

    cat_vals = []
    for col in CAT_DEMO:
        le  = _label_encoders[col]
        val = demo_dict[col]
        cat_vals.append(float(int(le.transform([val])[0]) if val in le.classes_ else 0))

    num_vals = [demo_dict[c] for c in NUM_DEMO]
    base_arr = np.array([cat_vals + num_vals], dtype=np.float32)
    scaled   = _demo_scaler.transform(base_arr)

    # Append left_from_cart as 12th feature (not scaled — binary 0/1)
    cart_exit_arr = np.array([[float(cart_exit)]], dtype=np.float32)
    full_arr      = np.concatenate([scaled, cart_exit_arr], axis=1)
    return torch.tensor(full_arr, dtype=torch.float32)   # (1, 12)


# ─── Public API ───────────────────────────────────────────────────────────────

def predict_abandonment(
    events: List[Dict[str, Any]],
    demographics: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Run v4 inference on one live session.

    Args:
        events:       List of event dicts from the current session.
        demographics: Dict of user profile fields.

    Returns:
        {
            "abandonment_probability": float,
            "segment": str,
            "segment_probabilities": {str: float},
            "should_intervene": bool,
            "cart_exit_detected": bool,
            "threshold_used": float,
        }
    """
    _ensure_ready()

    if not events:
        return {
            "abandonment_probability": 0.0,
            "segment": "distracted",
            "segment_probabilities": {n: 0.0 for n in CLASS_NAMES},
            "should_intervene": False,
            "cart_exit_detected": False,
            "threshold_used": ABANDON_THRESHOLD_NORMAL,
        }

    cart_exit = _detect_cart_exit(events)
    threshold = ABANDON_THRESHOLD_CART_EXIT if cart_exit else ABANDON_THRESHOLD_NORMAL

    seq_t, len_t = _build_seq_tensor(events)
    demo_t       = _build_demo_tensor(demographics, cart_exit)

    with torch.no_grad():
        logit_prob, logit_class = _model(
            seq_t.to(_device), demo_t.to(_device), len_t.to(_device)
        )
        prob      = float(torch.sigmoid(logit_prob).item())
        seg_probs = torch.softmax(logit_class, dim=1).squeeze(0).tolist()
        class_idx = int(torch.argmax(logit_class, dim=1).item())

    return {
        "abandonment_probability": round(prob, 4),
        "segment":                 CLASS_NAMES[class_idx],
        "segment_probabilities":   {n: round(p, 4) for n, p in zip(CLASS_NAMES, seg_probs)},
        "should_intervene":        prob >= threshold,
        "cart_exit_detected":      cart_exit,
        "threshold_used":          threshold,
    }
