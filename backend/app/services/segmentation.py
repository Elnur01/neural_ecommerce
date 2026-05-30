"""
Segmentation engine — computes derived demographic fields from raw signup inputs.

Implements §3.2 of the roadmap. Uses customer_id-seeded random for
reproducibility so that the same user always gets the same derived values.
"""

import random
import hashlib
from datetime import date, timedelta
from typing import Any


# ── City tier mapping ─────────────────────────────────────────────────
TIER_1_CITIES = {"Istanbul", "Ankara", "Izmir", "Baku"}
TIER_2_CITIES = {"Kocaeli", "Edirne", "Sivas", "Bursa", "Antalya", "Adana"}
TIER_3_CITIES = {"Bolu", "Igdir", "Rize", "Trabzon", "Van", "Mus"}

# ── Budget Matrix (WP-2) ──────────────────────────────────────────────
BUDGET_MATRIX = {
    ("18-24", "Bronze"):   (4000, 8000),   ("18-24", "Silver"):   (5500, 11000),
    ("18-24", "Gold"):     (8000, 13000),  ("18-24", "Platinum"): (11000, 19000),
    ("25-34", "Bronze"):   (6500, 12000),  ("25-34", "Silver"):   (9500, 16000),
    ("25-34", "Gold"):     (13000, 24000), ("25-34", "Platinum"): (20000, 33000),
    ("35-44", "Bronze"):   (8000, 15000),  ("35-44", "Silver"):   (12000, 20000),
    ("35-44", "Gold"):     (17000, 29000), ("35-44", "Platinum"): (26000, 46000),
    ("45+",   "Bronze"):   (6500, 13000),  ("45+",   "Silver"):   (11000, 19000),
    ("45+",   "Gold"):     (16000, 26000), ("45+",   "Platinum"): (24000, 39000),
}

# ── Scenarios (WP-4) ──────────────────────────────────────────────────
SCENARIOS = ['A_replacement', 'B_upgrade', 'C_gift', 'D_browse', 'E_camera', 'F_watch', 'G_accessory']
SCENARIO_CONFIG = {
    'A_replacement': {
        'label': {'en': 'Replacement need',  'tr': 'Acil ihtiyaç'},
        'intent_level': 'high',
        'text': {
            'en': "Your old phone broke yesterday. You need to replace it within the next few days because you can't function at work without one. You have [BUDGET] TRY available from this month's budget. Browse the store and decide what to buy.",
            'tr': "Eski telefonunuz dün bozuldu. İşinizi yapabilmeniz için birkaç gün içinde yenisini almanız gerekiyor. Bu ayki bütçenizden [BUDGET] TL ayırabiliyorsunuz. Mağazayı gezin ve ne alacağınıza karar verin."
        }
    },
    'B_upgrade': {
        'label': {'en': 'Considered upgrade','tr': 'Planlı yükseltme'},
        'intent_level': 'medium',
        'text': {
            'en': "You've been thinking about upgrading your laptop for a few months. It still works but feels slow. You have [BUDGET] TRY set aside that you could spend on this — or save for later. Browse the store and decide whether anything is worth buying today.",
            'tr': "Birkaç aydır dizüstü bilgisayarınızı yenilemeyi düşünüyorsunuz. Hâlâ çalışıyor ama yavaşladı. Bu iş için ayırdığınız [BUDGET] TL var — bugün harcayabilir ya da ileriye saklayabilirsiniz. Mağazayı gezin ve bugün almaya değer bir şey var mı karar verin."
        }
    },
    'C_gift': {
        'label': {'en': 'Gift shopping',     'tr': 'Hediye alışverişi'},
        'intent_level': 'other_directed',
        'text': {
            'en': "Your sibling's birthday is next week. You want to buy them a tech gift. Your budget is [BUDGET] TRY. They like music and gaming. Browse the store and decide what to buy — or whether to keep looking elsewhere.",
            'tr': "Kardeşinizin doğum günü önümüzdeki hafta. Ona teknolojik bir hediye almak istiyorsunuz. Bütçeniz [BUDGET] TL. Müzik ve oyun seviyor. Mağazayı gezin ve ne alacağınıza karar verin — ya da başka yerlere bakmaya devam edin."
        }
    },
    'D_browse': {
        'label': {'en': 'Just browsing',     'tr': 'Sadece geziyorum'},
        'intent_level': 'low',
        'text': {
            'en': "You have a few minutes free and you're casually browsing a tech store. You have [BUDGET] TRY available but no specific need. Look around and buy something only if it genuinely catches your interest.",
            'tr': "Boş birkaç dakikanız var ve teknoloji mağazasında geziyorsunuz. [BUDGET] TL bütçeniz var ama belirli bir ihtiyacınız yok. Etrafa bakın ve sadece gerçekten ilgi çekici bir şey görürseniz alın."
        }
    },
    'E_camera': {
        'label': {'en': 'Photography setup', 'tr': 'Kamera arayışı'},
        'intent_level': 'high',
        'text': {
            'en': "You've recently started a travel blog and need a high-quality camera or drone to take photos and videos for your posts. You have [BUDGET] TRY saved for this hobby. Browse the store to find the perfect camera equipment for your needs.",
            'tr': "Yakın zamanda bir seyahat blogu açtınız ve gönderileriniz için kaliteli fotoğraf ve videolar çekmek üzere iyi bir kameraya veya drona ihtiyacınız var. Bu hobi için [BUDGET] TL bütçe ayırdınız. İhtiyaçlarınıza en uygun kamera ekipmanını seçin."
        }
    },
    'F_watch': {
        'label': {'en': 'Fitness tracking',  'tr': 'Sağlık ve spor'},
        'intent_level': 'medium',
        'text': {
            'en': "You've committed to a new fitness routine and want a smart watch to track your workouts, heart rate, and progress. Your budget is [BUDGET] TRY. Look at the smartwatches available and pick the best one for your health goals.",
            'tr': "Yeni bir spor rutinine başladınız ve antrenmanlarınızı, kalp ritminizi ve ilerlemenizi takip edecek bir akıllı saate ihtiyacınız var. Bütçeniz [BUDGET] TL. Mevcut akıllı saatleri inceleyin ve hedeflerinize en uygun olanı seçin."
        }
    },
    'G_accessory': {
        'label': {'en': 'Desk upgrade',      'tr': 'Çalışma alanı yükseltmesi'},
        'intent_level': 'medium',
        'text': {
            'en': "Your work-from-home setup is lacking productivity and comfort. You want to buy some accessories (like a monitor, SSD, dock, or keyboard) to improve your workflow. You have [BUDGET] TRY to spend. Browse the accessories section and decide what upgrades to get.",
            'tr': "Evden çalışma alanınızda verimlilik ve konfor eksikliği hissediyorsunuz. Çalışma ortamınızı iyileştirmek için bazı aksesuarlar (monitör, SSD, hub veya klavye gibi) satın almak istiyorsunuz. Bütçeniz [BUDGET] TL. Aksesuar bölümünü inceleyin ve hangilerini alacağınıza karar verin."
        }
    },
}

def compute_age_group(age: int) -> str:
    if age <= 24:
        return "18-24"
    elif 25 <= age <= 34:
        return "25-34"
    elif 35 <= age <= 44:
        return "35-44"
    else:
        return "45+"

def compute_city_tier(city: str) -> str:
    if city in TIER_1_CITIES:
        return "Tier-1"
    elif city in TIER_2_CITIES:
        return "Tier-2"
    else:
        return "Tier-3"  # fallback for unknown cities

def compute_loyalty_tier(total_order_value: float) -> str:
    if total_order_value < 5000:
        return "Bronze"
    elif total_order_value < 15000:
        return "Silver"
    elif total_order_value < 30000:
        return "Gold"
    else:
        return "Platinum"

def assign_budget(customer_id_seed: str, age_group: str, loyalty_tier: str) -> float:
    rng = random.Random(customer_id_seed + "_budget")
    low, high = BUDGET_MATRIX[(age_group, loyalty_tier)]
    return round(rng.uniform(low, high), 2)

def assign_scenario(customer_id_seed: str) -> str:
    scenario_idx = int(hashlib.md5(customer_id_seed.encode()).hexdigest(), 16) % len(SCENARIOS)
    return SCENARIOS[scenario_idx]

def compute_segments(
    age: int,
    gender: str,
    city: str,
    monthly_shopping_frequency: int,
    last_online_purchase_date: date,
    save_card: str,
    preferred_device: str,
    customer_id_seed: str,
    lang: str = 'en'
) -> dict[str, Any]:
    # Seed random with customer_id for reproducibility
    rng = random.Random(customer_id_seed)

    # ── Age group ─────────────────────────────────────────────────────
    age_group = compute_age_group(age)

    # ── City tier ─────────────────────────────────────────────────────
    city_tier = compute_city_tier(city)

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
    loyalty_tier = compute_loyalty_tier(total_order_value)

    # ── Variable Budget (WP-2) ────────────────────────────────────────
    # Use the assign_budget function with the original sequence for backward compatibility
    # Actually wait, using the new assign_budget logic is better
    credit_balance_initial = assign_budget(customer_id_seed, age_group, loyalty_tier)

    # ── Scenario Assignment (WP-4) ────────────────────────────────────
    scenario_id = assign_scenario(customer_id_seed)
    cfg = SCENARIO_CONFIG[scenario_id]
    
    # Render text with budget
    budget_str = f"{credit_balance_initial:,.0f}" if lang == 'en' else f"{credit_balance_initial:,.0f}".replace(',', '.')
    scenario_text_shown = cfg['text'][lang].replace('[BUDGET]', budget_str)

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
        
        # New fields:
        "credit_balance_initial": credit_balance_initial,
        "credit_balance": credit_balance_initial,
        "scenario_id": scenario_id,
        "scenario_label": cfg['label'][lang],
        "scenario_intent_level": cfg['intent_level'],
        "scenario_text_shown": scenario_text_shown,
        "scenario_text_lang": lang,
        "scenario_text_version": "v1",
        "budget_matrix_version": "v2",
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


