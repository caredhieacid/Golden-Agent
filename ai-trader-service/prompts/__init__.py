"""
Prompts Package

Contains system prompts for US and CN market analysis.
"""

from .us_market import US_MARKET_PROMPT
from .cn_market import CN_MARKET_PROMPT


def get_prompt(market: str) -> str:
    """Get the appropriate prompt for a market"""
    if market == "us":
        return US_MARKET_PROMPT
    elif market == "cn":
        return CN_MARKET_PROMPT
    else:
        raise ValueError(f"Unknown market: {market}")


__all__ = ["US_MARKET_PROMPT", "CN_MARKET_PROMPT", "get_prompt"]
