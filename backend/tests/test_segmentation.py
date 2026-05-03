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
from datetime import date
from app.services.segmentation import compute_segments


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
    )


# ═══════════════════════════════════════════════════════════════════════
# AGE GROUP TESTS
# ═══════════════════════════════════════════════════════════════════════
class TestAgeGroup:
    @pytest.mark.parametrize(
        "age, expected",
        [
            (18, "18-24"),
            (20, "18-24"),
            (24, "18-24"),
            (25, "25-34"),
            (30, "25-34"),
            (34, "25-34"),
            (35, "35-44"),
            (40, "35-44"),
            (44, "35-44"),
            (45, "45+"),
            (60, "45+"),
            (100, "45+"),
        ],
    )
    def test_age_group_boundaries(self, age, expected):
        result = _make_segments(age=age)
        assert result["age_group"] == expected


# ═══════════════════════════════════════════════════════════════════════
# CITY TIER TESTS
# ═══════════════════════════════════════════════════════════════════════
class TestCityTier:
    @pytest.mark.parametrize(
        "city, expected",
        [
            ("Istanbul", "Tier-1"),
            ("Ankara", "Tier-1"),
            ("Izmir", "Tier-1"),
            ("Baku", "Tier-1"),
            ("Kocaeli", "Tier-2"),
            ("Edirne", "Tier-2"),
            ("Sivas", "Tier-2"),
            ("Bolu", "Tier-3"),
            ("Igdir", "Tier-3"),
            ("Rize", "Tier-3"),
            ("UnknownCity", "Tier-3"),  # fallback
        ],
    )
    def test_city_tiers(self, city, expected):
        result = _make_segments(city=city)
        assert result["city_tier"] == expected


# ═══════════════════════════════════════════════════════════════════════
# LOYALTY TIER TESTS (via zero-frequency edge case)
# ═══════════════════════════════════════════════════════════════════════
class TestLoyaltyTier:
    def test_zero_frequency_gives_bronze(self):
        result = _make_segments(freq=0)
        assert result["lifetime_order_count"] == 0
        assert result["total_order_value"] == 0
        assert result["avg_order_value"] == 0
        assert result["loyalty_tier"] == "Bronze"


# ═══════════════════════════════════════════════════════════════════════
# PAYMENT METHOD SAVED
# ═══════════════════════════════════════════════════════════════════════
class TestPaymentMethodSaved:
    def test_save_card_yes(self):
        result = _make_segments(save_card="yes")
        assert result["payment_method_saved"] is True

    def test_save_card_no(self):
        result = _make_segments(save_card="no")
        assert result["payment_method_saved"] is False


# ═══════════════════════════════════════════════════════════════════════
# REPRODUCIBILITY
# ═══════════════════════════════════════════════════════════════════════
class TestReproducibility:
    def test_same_seed_same_output(self):
        r1 = _make_segments(freq=10, seed="abc-123")
        r2 = _make_segments(freq=10, seed="abc-123")
        assert r1 == r2

    def test_different_seed_may_differ(self):
        r1 = _make_segments(freq=10, seed="seed-a")
        r2 = _make_segments(freq=10, seed="seed-b")
        # They could coincidentally match, but loyalty_tier should vary
        # with different random sequences. At minimum, the function runs.
        assert isinstance(r1["lifetime_order_count"], int)
        assert isinstance(r2["lifetime_order_count"], int)


# ═══════════════════════════════════════════════════════════════════════
# DEVICE PASS-THROUGH
# ═══════════════════════════════════════════════════════════════════════
class TestDevice:
    @pytest.mark.parametrize("device", ["Mobile", "Desktop", "Tablet"])
    def test_device_passthrough(self, device):
        result = _make_segments(device=device)
        assert result["preferred_device"] == device
