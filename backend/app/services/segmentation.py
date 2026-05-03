"""
Segmentation engine — computes derived demographic fields from raw signup inputs.

Implements §3.2 of the roadmap.  Uses customer_id-seeded random for
reproducibility so that the same user always gets the same derived values.
"""

import random
from datetime import date, timedelta
from typing import Any


# ── City tier mapping ─────────────────────────────────────────────────
TIER_1_CITIES = {"Istanbul", "Ankara", "Izmir", "Baku"}
TIER_2_CITIES = {"Kocaeli", "Edirne", "Sivas", "Bursa", "Antalya", "Adana"}
TIER_3_CITIES = {"Bolu", "Igdir", "Rize", "Trabzon", "Van", "Mus"}


def compute_segments(
    age: int,
    gender: str,
    city: str,
    monthly_shopping_frequency: int,
    last_online_purchase_date: date,
    save_card: str,
    preferred_device: str,
    customer_id_seed: str,
) -> dict[str, Any]:
    """
    Derive all demographic segment fields from raw signup inputs.

    Args:
        age: Raw age (18–100).
        gender: "M" or "F".
        city: Raw city name.
        monthly_shopping_frequency: Self-reported frequency.
        last_online_purchase_date: Date of last online purchase.
        save_card: "yes" or "no".
        preferred_device: Parsed from User-Agent ("Mobile", "Desktop", "Tablet").
        customer_id_seed: UUID string used to seed random for reproducibility.

    Returns:
        Dictionary of derived demographic fields.
    """
    # Seed random with customer_id for reproducibility
    rng = random.Random(customer_id_seed)

    # ── Age group ─────────────────────────────────────────────────────
    if 18 <= age <= 24:
        age_group = "18-24"
    elif 25 <= age <= 34:
        age_group = "25-34"
    elif 35 <= age <= 44:
        age_group = "35-44"
    else:
        age_group = "45+"

    # ── City tier ─────────────────────────────────────────────────────
    if city in TIER_1_CITIES:
        city_tier = "Tier-1"
    elif city in TIER_2_CITIES:
        city_tier = "Tier-2"
    else:
        city_tier = "Tier-3"  # fallback for unknown cities

    # ── Account age (days since last online purchase) ─────────────────
    today = date.today()
    account_age_days = max(0, (today - last_online_purchase_date).days)

    # ── Lifetime order count ──────────────────────────────────────────
    if monthly_shopping_frequency == 0:
        lifetime_order_count = 0
    elif monthly_shopping_frequency < 5:
        lifetime_order_count = rng.randint(0, 5)
    else:
        lifetime_order_count = rng.randint(5, 20)

    # ── Total & average order value ───────────────────────────────────
    total_order_value = sum(
        rng.randint(700, 3000) for _ in range(lifetime_order_count)
    )
    avg_order_value = (
        round(total_order_value / lifetime_order_count, 2)
        if lifetime_order_count > 0
        else 0
    )

    # ── Loyalty tier ──────────────────────────────────────────────────
    if total_order_value < 5000:
        loyalty_tier = "Bronze"
    elif total_order_value < 15000:
        loyalty_tier = "Silver"
    elif total_order_value < 30000:
        loyalty_tier = "Gold"
    else:
        loyalty_tier = "Platinum"

    # ── Payment method saved ──────────────────────────────────────────
    payment_method_saved = save_card == "yes"

    return {
        "age_group": age_group,
        "gender": gender,
        "raw_city": city,
        "city_tier": city_tier,
        "account_age_days": account_age_days,
        "lifetime_order_count": lifetime_order_count,
        "total_order_value": total_order_value,
        "avg_order_value": avg_order_value,
        "loyalty_tier": loyalty_tier,
        "preferred_device": preferred_device,
        "payment_method_saved": payment_method_saved,
        "last_purchase_date": last_online_purchase_date,
        "raw_age": age,
        "monthly_shopping_frequency": monthly_shopping_frequency,
    }


def parse_device_from_user_agent(user_agent_string: str) -> str:
    """
    Parse a User-Agent string to determine the device type.

    Returns one of: "Mobile", "Tablet", "Desktop".
    """
    try:
        from user_agents import parse
        ua = parse(user_agent_string)
        if ua.is_mobile:
            return "Mobile"
        elif ua.is_tablet:
            return "Tablet"
        else:
            return "Desktop"
    except Exception:
        return "Desktop"
