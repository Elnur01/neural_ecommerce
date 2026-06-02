"""
Agent Service — wraps the LangGraph CustomerExperienceAgent for use inside
the FastAPI backend.

Responsibilities:
  1. Segment adapter: translates LSTM segment names → LangGraph UserSegment values
  2. Lazy-initializes the CustomerExperienceAgent (requires GEMINI_API_KEY)
  3. Exposes a single public function:

       result = run_intervention(
           intent_score, lstm_segment, cart_value,
           session_history, session_id, user_id
       )

     Returns:
       {
         "intervention_status": bool,
         "action":              str,   # e.g. "dynamic_discount"
         "message":             str,   # LLM-generated message
         "langgraph_segment":   str,   # e.g. "Price-Oriented"
       }
"""

import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ─── Segment adapter ──────────────────────────────────────────────────────────
# Maps LSTM CLASS_NAMES → LangGraph UserSegment enum values
_SEGMENT_MAP: Dict[str, str] = {
    "price_sensitive":    "Price-Oriented",
    "needs_social_proof": "Indecisive",
    "loyal_returner":     "Loyal",
    "distracted":         "Browser",
    "comparison_shopping":"Information-Seeking",
}


def adapt_segment(lstm_segment: str) -> str:
    """
    Convert an LSTM segment name to the LangGraph UserSegment value.

    Falls back to "Browser" (→ GENERIC_REMINDER) for any unknown segment.
    """
    return _SEGMENT_MAP.get(lstm_segment, "Browser")


# Toggle between static messages and live LangGraph/Gemini LLM
USE_STATIC_MESSAGES: bool = True

_STATIC_MESSAGES: Dict[str, str] = {
    "dynamic_discount": "We noticed you left items in your cart! Use code WELCOME10 for an extra 10% off your purchase.",
    "social_proof":     "Items in your cart are in high demand. Complete your order now before they sell out!",
    "info_guide":       "Need more information about the items in your cart? Complete your purchase now or contact our support team.",
    "loyalty_reward":   "We appreciate your loyalty! Complete your order today and enjoy priority delivery.",
    "generic_reminder": "Your items are waiting in your cart. Complete your purchase today!",
}

_ACTION_MAP: Dict[str, str] = {
    "price_sensitive":    "dynamic_discount",
    "needs_social_proof": "social_proof",
    "comparison_shopping":"info_guide",
    "loyal_returner":     "loyalty_reward",
    "distracted":         "generic_reminder",
}


# ─── Agent singleton ─────────────────────────────────────────────────────────
_agent = None
_agent_ready: bool = False


def _load_agent_module():
    """Add Claude Guideline directory to sys.path and import CustomerExperienceAgent."""
    agent_dir = os.getenv("LANGGRAPH_AGENT_DIR", "")
    if not agent_dir:
        raise RuntimeError(
            "LANGGRAPH_AGENT_DIR env var not set. "
            "Point it to the directory containing langgraph_agent.py."
        )
    agent_dir = str(Path(agent_dir).resolve())
    if agent_dir not in sys.path:
        sys.path.insert(0, agent_dir)

    from langgraph_agent import CustomerExperienceAgent  # noqa: PLC0415
    return CustomerExperienceAgent


def initialize(gemini_api_key: str) -> None:
    """
    Build the CustomerExperienceAgent singleton.
    Called from FastAPI startup (or lazily on first call).
    """
    global _agent, _agent_ready
    CustomerExperienceAgent = _load_agent_module()
    _agent = CustomerExperienceAgent(
        gemini_api_key=gemini_api_key,
        risk_threshold=0.70,
        temperature=0.7,
    )
    _agent_ready = True
    logger.info("Agent service: LangGraph CustomerExperienceAgent initialized.")


def _ensure_ready() -> None:
    """Lazy-init using env vars if not yet initialized."""
    if _agent_ready:
        return
    key = os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise RuntimeError(
            "Agent service not initialized. Set GEMINI_API_KEY in .env "
            "or call agent_service.initialize() explicitly."
        )
    initialize(key)


# ─── Public API ───────────────────────────────────────────────────────────────

def run_intervention(
    intent_score: float,
    lstm_segment: str,
    cart_value: float,
    session_history: List[Dict[str, Any]],
    session_id: str,
    user_id: str,
) -> Dict[str, Any]:
    """
    Translate LSTM output → LangGraph input, run agent pipeline, return result.

    Args:
        intent_score:     Abandonment probability from LSTM (0.0–1.0).
        lstm_segment:     Segment name from LSTM (e.g. "price_sensitive").
        cart_value:       Current cart total in currency units.
        session_history:  List of recent event dicts (last N events).
        session_id:       Session identifier string.
        user_id:          User identifier string.

    Returns:
        {
          "intervention_status": bool,
          "action":              str,
          "message":             str,
          "langgraph_segment":   str,
        }
    """
    langgraph_segment = adapt_segment(lstm_segment)

    if USE_STATIC_MESSAGES:
        action = _ACTION_MAP.get(lstm_segment, "generic_reminder")
        message = _STATIC_MESSAGES.get(action, _STATIC_MESSAGES["generic_reminder"])
        return {
            "intervention_status": True,
            "action":              action,
            "message":             message,
            "langgraph_segment":   langgraph_segment,
        }

    _ensure_ready()

    initial_state = {
        "session_id":          session_id,
        "user_id":             user_id,
        "intent_score":        float(intent_score),
        "user_segment":        langgraph_segment,
        "cart_value":          float(cart_value),
        "session_history":     session_history or [],
        "intervention_status": False,
        "current_action":      "",
        "generated_message":   "",
    }

    final_state = _agent.run(initial_state)

    return {
        "intervention_status": bool(final_state.get("intervention_status", False)),
        "action":              final_state.get("current_action", ""),
        "message":             final_state.get("generated_message", ""),
        "langgraph_segment":   langgraph_segment,
    }
