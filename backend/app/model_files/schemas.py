from enum import Enum

class UserSegment(str, Enum):
    PRICE_ORIENTED = "Price-Oriented"
    INDECISIVE = "Indecisive"
    INFORMATION_SEEKING = "Information-Seeking"
    LOYAL = "Loyal"
    BROWSER = "Browser"

class ActionType(str, Enum):
    DYNAMIC_DISCOUNT = "dynamic_discount"
    SOCIAL_PROOF = "social_proof"
    INFO_GUIDE = "info_guide"
    LOYALTY_REWARD = "loyalty_reward"
    GENERIC_REMINDER = "generic_reminder"
