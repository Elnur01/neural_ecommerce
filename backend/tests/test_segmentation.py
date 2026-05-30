"""
Unit tests for the segmentation engine.
Table-driven cases covering:
- All age group boundaries
- All city tiers (including fallback)
- All loyalty tiers
- Zero-frequency edge case
- Reproducibility (same customer_id = same output)
"""

import pytest
import uuid
from collections import Counter
from datetime import date
from app.services.segmentation import (
    compute_segments,
    compute_age_group,
    compute_city_tier,
    compute_loyalty_tier,
    assign_budget,
    assign_scenario,
    BUDGET_MATRIX,
    SCENARIOS
)

# ── Test helpers ──────────────────────────────────────────────────────
FIXED_SEED = "00000000-0000-0000-0000-000000000001"
BASE_DATE = date(2026, 1, 1)

def _make_segments(
    age=25,
    gender="M",
    city="Istanbul",
    freq=3,
    last_purchase=BASE_DATE,
    save_card="no",
    device="Desktop",
    seed=FIXED_SEED,
    lang="en"
):
    return compute_segments(
        age=age,
        gender=gender,
        city=city,
        monthly_shopping_frequency=freq,
        last_online_purchase_date=last_purchase,
        save_card=save_card,
        preferred_device=device,
        customer_id_seed=seed,
        lang=lang
    )

def test_age_group_boundaries():
    assert compute_age_group(17) == "18-24"  # below floor → still 18-24 by spec
    assert compute_age_group(18) == "18-24"
    assert compute_age_group(24) == "18-24"
    assert compute_age_group(25) == "25-34"
    assert compute_age_group(34) == "25-34"
    assert compute_age_group(35) == "35-44"
    assert compute_age_group(44) == "35-44"
    assert compute_age_group(45) == "45+"
    assert compute_age_group(99) == "45+"

def test_city_tier_all_cities():
    for c in ["Istanbul", "Ankara", "Izmir", "Baku"]: 
        assert compute_city_tier(c) == "Tier-1"
    for c in ["Kocaeli", "Edirne", "Sivas"]:          
        assert compute_city_tier(c) == "Tier-2"
    for c in ["Bolu", "Igdir", "Rize"]:               
        assert compute_city_tier(c) == "Tier-3"
    assert compute_city_tier("Unknown") == "Tier-3"   # safe default

def test_lifetime_order_count_freq_zero():
    result = _make_segments(freq=0)
    assert result["lifetime_order_count"] == 0

def test_lifetime_order_count_reproducible():
    a = _make_segments(freq=7, seed="user-abc")
    b = _make_segments(freq=7, seed="user-abc")
    assert a["lifetime_order_count"] == b["lifetime_order_count"]
    assert a == b

def test_loyalty_tier_thresholds():
    assert compute_loyalty_tier(0)      == "Bronze"
    assert compute_loyalty_tier(4999)   == "Bronze"
    assert compute_loyalty_tier(5000)   == "Silver"
    assert compute_loyalty_tier(14999)  == "Silver"
    assert compute_loyalty_tier(15000)  == "Gold"
    assert compute_loyalty_tier(29999)  == "Gold"
    assert compute_loyalty_tier(30000)  == "Platinum"

@pytest.mark.parametrize("age,loyalty", [
    (ag, lt) for ag in ["18-24","25-34","35-44","45+"]
             for lt in ["Bronze","Silver","Gold","Platinum"]
])
def test_budget_matrix_all_16_cells(age, loyalty):
    budget = assign_budget("test-uid", age, loyalty)
    low, high = BUDGET_MATRIX[(age, loyalty)]
    assert low <= budget <= high

def test_scenario_assignment_deterministic():
    s1 = assign_scenario("user-xyz")
    s2 = assign_scenario("user-xyz")
    assert s1 == s2

def test_scenario_assignment_balanced_over_1000_uuids():
    counts = Counter(assign_scenario(str(uuid.uuid4())) for _ in range(1000))
    expected = 1000 / len(SCENARIOS)
    for arm in SCENARIOS:
        assert expected * 0.5 <= counts[arm] <= expected * 1.5, f"{arm} imbalanced: {counts[arm]}"

def test_segmentation_full_payload():
    out = _make_segments(seed="uid-1", device="Desktop", lang="tr")
    required = {"age_group","gender","city_tier","account_age_days",
                "lifetime_order_count","total_order_value","avg_order_value",
                "loyalty_tier","credit_balance_initial","scenario_id",
                "scenario_text_shown","scenario_text_lang"}
    assert required.issubset(out.keys())
    assert out["scenario_text_lang"] == "tr"
    assert "[BUDGET]" not in out["scenario_text_shown"]  # placeholder filled

def test_save_card_yes():
    result = _make_segments(save_card="yes")
    assert result["payment_method_saved"] is True

def test_save_card_no():
    result = _make_segments(save_card="no")
    assert result["payment_method_saved"] is False

@pytest.mark.parametrize("device", ["Mobile", "Desktop", "Tablet"])
def test_device_passthrough(device):
    result = _make_segments(device=device)
    assert result["preferred_device"] == device
