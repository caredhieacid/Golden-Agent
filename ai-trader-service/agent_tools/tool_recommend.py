"""
Recommendation Tools

Tools for generating buy/sell/hold recommendations.
These tools do NOT execute actual trades - they only produce
structured recommendation outputs.
"""

import os
from typing import Optional


def _calc_risk_level(confidence: float) -> str:
    """Calculate risk level based on confidence score"""
    high_threshold = float(os.getenv("HIGH_RISK_THRESHOLD", "0.3"))
    medium_threshold = float(os.getenv("MEDIUM_RISK_THRESHOLD", "0.6"))

    if confidence < high_threshold:
        return "high"
    elif confidence < medium_threshold:
        return "medium"
    return "low"


def recommend_buy(
    symbol: str,
    confidence: float,
    reasoning: str,
    price_target: Optional[float] = None,
    stop_loss: Optional[float] = None,
) -> dict:
    """
    Generate a buy recommendation.

    Args:
        symbol: Stock ticker symbol (e.g., "AAPL", "000001")
        confidence: Confidence level from 0.0 to 1.0
        reasoning: Detailed explanation for the recommendation
        price_target: Optional target price for the position
        stop_loss: Optional stop-loss price (recommended for risk management)

    Returns:
        Structured recommendation object
    """
    if not symbol:
        raise ValueError("Symbol is required")
    if not 0.0 <= confidence <= 1.0:
        raise ValueError("Confidence must be between 0.0 and 1.0")
    if not reasoning or len(reasoning) < 10:
        raise ValueError("Reasoning must be at least 10 characters")

    return {
        "action": "buy",
        "symbol": symbol.upper(),
        "confidence": round(confidence, 2),
        "risk_level": _calc_risk_level(confidence),
        "reasoning": reasoning,
        "price_target": price_target,
        "stop_loss": stop_loss,
        "disclaimer": os.getenv(
            "DISCLAIMER",
            "仅供参考，不构成投资建议。投资有风险，入市需谨慎。"
        ),
    }


def recommend_sell(
    symbol: str,
    confidence: float,
    reasoning: str,
    price_target: Optional[float] = None,
) -> dict:
    """
    Generate a sell recommendation.

    Args:
        symbol: Stock ticker symbol
        confidence: Confidence level from 0.0 to 1.0
        reasoning: Detailed explanation for the recommendation
        price_target: Optional target price (expected lower bound)

    Returns:
        Structured recommendation object
    """
    if not symbol:
        raise ValueError("Symbol is required")
    if not 0.0 <= confidence <= 1.0:
        raise ValueError("Confidence must be between 0.0 and 1.0")
    if not reasoning or len(reasoning) < 10:
        raise ValueError("Reasoning must be at least 10 characters")

    return {
        "action": "sell",
        "symbol": symbol.upper(),
        "confidence": round(confidence, 2),
        "risk_level": _calc_risk_level(confidence),
        "reasoning": reasoning,
        "price_target": price_target,
        "disclaimer": os.getenv(
            "DISCLAIMER",
            "仅供参考，不构成投资建议。投资有风险，入市需谨慎。"
        ),
    }


def recommend_hold(
    symbol: str,
    reasoning: str,
) -> dict:
    """
    Generate a hold/watch recommendation.

    Use this when:
    - Market conditions are uncertain
    - Waiting for more confirmation
    - Current position should be maintained

    Args:
        symbol: Stock ticker symbol
        reasoning: Detailed explanation for the hold recommendation

    Returns:
        Structured recommendation object
    """
    if not symbol:
        raise ValueError("Symbol is required")
    if not reasoning or len(reasoning) < 10:
        raise ValueError("Reasoning must be at least 10 characters")

    return {
        "action": "hold",
        "symbol": symbol.upper(),
        "confidence": 0.5,  # Neutral confidence for hold
        "risk_level": "medium",
        "reasoning": reasoning,
        "disclaimer": os.getenv(
            "DISCLAIMER",
            "仅供参考，不构成投资建议。投资有风险，入市需谨慎。"
        ),
    }
