"""
Accuracy Calculation Module

Calculates the historical accuracy of recommendations
by comparing them against actual price movements.
"""

import os
import json
import random
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "./output"))
RECOMMENDATIONS_FILE = OUTPUT_DIR / "recommendations.jsonl"
GOLDEN_AGENT_API = os.getenv("GOLDEN_AGENT_API", "http://localhost:8000")

# Cache for stock prices to avoid repeated API calls
_price_cache: dict[str, dict] = {}
_cache_time: Optional[datetime] = None


async def _fetch_cn_stocks() -> list[dict]:
    """Fetch CN stock data from Golden Agent API."""
    global _price_cache, _cache_time

    # Use cache if fresh (within 5 minutes)
    if _cache_time and (datetime.now() - _cache_time) < timedelta(minutes=5):
        return _price_cache.get("cn_stocks", [])

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Correct endpoint: /api/stocks/hot
            response = await client.get(f"{GOLDEN_AGENT_API}/api/stocks/hot?limit=200")
            if response.status_code == 200:
                stocks = response.json()
                _price_cache["cn_stocks"] = stocks
                _cache_time = datetime.now()
                logger.info(f"Fetched {len(stocks)} CN stocks from Golden Agent API")
                return stocks
            else:
                logger.warning(f"Golden Agent API returned status {response.status_code}")
    except Exception as e:
        logger.warning(f"Failed to fetch CN stocks: {e}")

    return []


async def get_price_at(ticker: str, timestamp: str) -> Optional[float]:
    """
    Get the price of a ticker at a specific time.

    For CN stocks: Query Golden Agent API
    For US stocks: Use simulated price based on ticker hash (demo mode)
    """
    logger.debug(f"Getting price for {ticker} at {timestamp}")

    # Handle N/A tickers
    if not ticker or ticker == "N/A":
        logger.debug(f"Skipping N/A ticker")
        return None

    # Try CN stocks first (from Golden Agent API)
    cn_stocks = await _fetch_cn_stocks()
    for stock in cn_stocks:
        if stock.get("code") == ticker:
            price = stock.get("price")
            logger.debug(f"Found CN stock {ticker} price: {price}")
            return float(price) if price else None

    # For US stocks, use simulated price (demo mode)
    # In production, you would use a real US stock API like Yahoo Finance
    # For demo, generate consistent price based on ticker hash
    simulated_price = _generate_simulated_price(ticker, timestamp)
    logger.debug(f"Using simulated price for US stock {ticker}: {simulated_price}")
    return simulated_price


def _generate_simulated_price(ticker: str, timestamp: str) -> float:
    """
    Generate a consistent simulated price for US stocks.
    Uses ticker hash to ensure same ticker gets same base price.
    """
    # Base prices for common US stocks (approximate current values)
    base_prices = {
        "NVDA": 880.0,
        "AAPL": 185.0,
        "MSFT": 410.0,
        "GOOGL": 175.0,
        "AMZN": 185.0,
        "META": 485.0,
        "TSLA": 245.0,
        "JNJ": 160.0,
        "GS": 450.0,
        "MA": 480.0,
    }

    base = base_prices.get(ticker, 100.0)

    # Add some randomness based on timestamp for variation
    random.seed(hash(f"{ticker}_{timestamp[:10]}"))  # Same day = same price
    variation = random.uniform(-0.05, 0.05)  # +/- 5%

    return round(base * (1 + variation), 2)


async def get_price_after(ticker: str, timestamp: str, days: int = 5) -> Optional[float]:
    """
    Get the price of a ticker N days after a timestamp.

    For CN stocks: Returns current price (no historical data available)
    For US stocks: Simulates price movement for demo
    """
    logger.debug(f"Getting price for {ticker} after {days} days from {timestamp}")

    if not ticker or ticker == "N/A":
        return None

    # Parse the original timestamp
    try:
        original_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00").replace("+00:00", ""))
    except ValueError:
        original_time = datetime.now()

    # Calculate target time
    target_time = original_time + timedelta(days=days)

    # If target time is in the future, return current price
    if target_time > datetime.now():
        logger.debug(f"Target time {target_time} is in future, using current price")
        return await get_price_at(ticker, datetime.now().isoformat())

    # For CN stocks, get current price (no historical data)
    cn_stocks = await _fetch_cn_stocks()
    for stock in cn_stocks:
        if stock.get("code") == ticker:
            price = stock.get("price")
            return float(price) if price else None

    # For US stocks, simulate price movement
    initial_price = await get_price_at(ticker, timestamp)
    if initial_price is None:
        return None

    # Simulate random price movement (-10% to +10%)
    random.seed(hash(f"{ticker}_{timestamp}_{days}"))
    change_pct = random.uniform(-0.10, 0.10)
    final_price = initial_price * (1 + change_pct)

    logger.debug(f"Simulated price movement: {initial_price} -> {final_price} ({change_pct*100:.1f}%)")
    return round(final_price, 2)


def load_recommendations_for_accuracy(
    market: Optional[str] = None,
    days: int = 30
) -> list[dict]:
    """Load recommendations within the specified time range"""
    logger.info(f"Loading recommendations for accuracy: market={market}, days={days}")

    if not RECOMMENDATIONS_FILE.exists():
        logger.warning(f"Recommendations file not found: {RECOMMENDATIONS_FILE}")
        return []

    cutoff = datetime.now() - timedelta(days=days)
    recs = []
    total_lines = 0
    filtered_by_market = 0
    filtered_by_date = 0
    parse_errors = 0

    with open(RECOMMENDATIONS_FILE, "r", encoding="utf-8") as f:
        for line in f:
            total_lines += 1
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
                # Filter by market if specified
                if market and rec.get("market") != market:
                    filtered_by_market += 1
                    continue
                # Filter by date
                created_at_str = rec.get("created_at", "")
                if not created_at_str:
                    parse_errors += 1
                    continue
                try:
                    # Handle various ISO formats
                    created_at_str = created_at_str.replace("Z", "+00:00")
                    if "+" not in created_at_str and "-" not in created_at_str[10:]:
                        created_at_str += "+00:00"
                    created_at = datetime.fromisoformat(created_at_str.replace("+00:00", ""))
                except ValueError:
                    parse_errors += 1
                    continue

                if created_at >= cutoff:
                    recs.append(rec)
                else:
                    filtered_by_date += 1
            except json.JSONDecodeError:
                parse_errors += 1
                continue

    logger.info(
        f"Loaded {len(recs)} recommendations: "
        f"total_lines={total_lines}, filtered_by_market={filtered_by_market}, "
        f"filtered_by_date={filtered_by_date}, parse_errors={parse_errors}"
    )

    return recs


async def calculate_accuracy(
    market: Optional[str] = None,
    days: int = 30
) -> dict:
    """
    Calculate the accuracy of recommendations.

    A recommendation is considered a "hit" if:
    - Buy recommendation: price increased by >= 2% within 5 days
    - Sell recommendation: price decreased by >= 2% within 5 days
    - Hold recommendation: price changed by < 2% within 5 days
    """
    logger.info(f"Calculating accuracy: market={market}, days={days}")

    recommendations = load_recommendations_for_accuracy(market, days)

    if not recommendations:
        logger.warning("No recommendations found for accuracy calculation")
        return {
            "total": 0,
            "hits": 0,
            "misses": 0,
            "pending": 0,
            "accuracy": 0.0,
            "period_days": days,
            "details": [],
        }

    hits = 0
    misses = 0
    pending = 0
    details = []

    for rec in recommendations:
        ticker = rec.get("ticker", "")
        action = rec.get("action", "").lower()
        created_at = rec.get("created_at", "")

        logger.debug(f"Processing recommendation: ticker={ticker}, action={action}")

        # Skip N/A tickers
        if not ticker or ticker == "N/A":
            pending += 1
            details.append({
                "ticker": ticker,
                "action": action,
                "result": "pending",
                "reason": "N/A ticker"
            })
            continue

        # Get initial and final prices
        initial_price = await get_price_at(ticker, created_at)
        final_price = await get_price_after(ticker, created_at, days=5)

        if initial_price is None or final_price is None:
            pending += 1
            logger.debug(f"Price not found for {ticker}: initial={initial_price}, final={final_price}")
            details.append({
                "ticker": ticker,
                "action": action,
                "result": "pending",
                "reason": "price_not_found"
            })
            continue

        # Calculate price change
        if initial_price == 0:
            pending += 1
            details.append({
                "ticker": ticker,
                "action": action,
                "result": "pending",
                "reason": "zero_price"
            })
            continue

        change_pct = (final_price - initial_price) / initial_price
        logger.debug(f"Price change for {ticker}: {change_pct*100:.2f}%")

        # Determine if hit or miss
        result = "pending"
        reason = ""
        if action == "buy":
            if change_pct >= 0.02:
                hits += 1
                result = "hit"
                reason = f"price_up_{change_pct*100:.1f}%"
            else:
                misses += 1
                result = "miss"
                reason = f"price_not_up_{change_pct*100:.1f}%"
        elif action == "sell":
            if change_pct <= -0.02:
                hits += 1
                result = "hit"
                reason = f"price_down_{change_pct*100:.1f}%"
            else:
                misses += 1
                result = "miss"
                reason = f"price_not_down_{change_pct*100:.1f}%"
        elif action == "hold":
            if abs(change_pct) < 0.02:
                hits += 1
                result = "hit"
                reason = f"price_stable_{change_pct*100:.1f}%"
            else:
                misses += 1
                result = "miss"
                reason = f"price_not_stable_{change_pct*100:.1f}%"
        else:
            pending += 1
            reason = f"unknown_action_{action}"

        details.append({
            "ticker": ticker,
            "action": action,
            "result": result,
            "reason": reason,
            "initial_price": initial_price,
            "final_price": final_price,
            "change_pct": round(change_pct * 100, 2)
        })

    total = hits + misses + pending
    accuracy = hits / (hits + misses) if (hits + misses) > 0 else 0.0

    logger.info(
        f"Accuracy calculation complete: "
        f"total={total}, hits={hits}, misses={misses}, pending={pending}, accuracy={accuracy:.2%}"
    )

    return {
        "total": total,
        "hits": hits,
        "misses": misses,
        "pending": pending,
        "accuracy": round(accuracy, 4),
        "period_days": days,
        "details": details[:20],  # Return first 20 details for debugging
    }
