"""
AI Recommendation Service - FastAPI Entry Point

This service provides investment recommendations for US and CN markets
using LLM-based analysis. It does NOT execute actual trades.
"""

import os
import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import dotenv

# Load environment variables
dotenv.load_dotenv()

# Configuration
SERVICE_PORT = int(os.getenv("SERVICE_PORT", "8001"))
SERVICE_HOST = os.getenv("SERVICE_HOST", "0.0.0.0")
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "./output"))
RECOMMENDATIONS_FILE = OUTPUT_DIR / "recommendations.jsonl"

# Ensure output directory exists
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="AI Recommendation Service",
    description="Investment recommendation service for US and CN markets",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============= Models =============

class AnalysisRequest(BaseModel):
    market: str = Field(..., description="Market to analyze: 'us' or 'cn'")
    model: Optional[str] = Field(None, description="Optional model override")


class Recommendation(BaseModel):
    id: str
    market: str
    ticker: str
    action: str = Field(..., description="buy | sell | hold")
    confidence: float = Field(..., ge=0.0, le=1.0)
    risk_level: str = Field(..., description="low | medium | high")
    reasoning: str
    price_target: Optional[float] = None
    stop_loss: Optional[float] = None
    created_at: str
    # Enhanced fields
    company_name: Optional[str] = None
    confidence_breakdown: Optional[dict] = None
    analysis: Optional[dict] = None
    recommendation_detail: Optional[dict] = None
    risk_assessment: Optional[dict] = None
    disclaimer: Optional[str] = None
    # Flattened fields for frontend
    position_size: Optional[str] = None
    strategy: Optional[str] = None
    holding_period: Optional[str] = None
    suitable_for: Optional[list] = None
    risk_factors: Optional[list] = None
    fundamental_analysis: Optional[list] = None
    technical_signals: Optional[list] = None
    institutional_behavior: Optional[list] = None


class AccuracyStats(BaseModel):
    total: int
    hits: int
    misses: int
    pending: int
    accuracy: float
    period_days: int


class AnalysisStatus(BaseModel):
    status: str
    market: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    recommendations_count: int = 0
    error: Optional[str] = None


# ============= In-memory state =============

analysis_status: dict[str, AnalysisStatus] = {
    "us": AnalysisStatus(status="idle", market="us"),
    "cn": AnalysisStatus(status="idle", market="cn"),
}


# ============= Helper functions =============

def generate_rec_id(market: str, ticker: str) -> str:
    """Generate unique recommendation ID"""
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"{market}_{ticker}_{ts}"


def calc_risk_level(confidence: float) -> str:
    """Calculate risk level based on confidence"""
    high_threshold = float(os.getenv("HIGH_RISK_THRESHOLD", "0.3"))
    medium_threshold = float(os.getenv("MEDIUM_RISK_THRESHOLD", "0.6"))

    if confidence < high_threshold:
        return "high"
    elif confidence < medium_threshold:
        return "medium"
    return "low"


def save_recommendation(rec: Recommendation) -> None:
    """Append recommendation to JSONL file"""
    with open(RECOMMENDATIONS_FILE, "a", encoding="utf-8") as f:
        # Handle both Pydantic models and dict-like objects
        if hasattr(rec, 'model_dump'):
            f.write(rec.model_dump_json() + "\n")
        elif hasattr(rec, 'to_dict'):
            f.write(json.dumps(rec.to_dict()) + "\n")
        else:
            f.write(json.dumps(rec) + "\n")


def load_recommendations(
    market: Optional[str] = None,
    limit: int = 50,
    include_outcomes: bool = False
) -> list[dict]:
    """Load recommendations from JSONL file"""
    if not RECOMMENDATIONS_FILE.exists():
        return []

    recs = []
    with open(RECOMMENDATIONS_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
                if market is None or rec.get("market") == market:
                    recs.append(rec)
            except json.JSONDecodeError:
                continue

    # Sort by created_at descending
    recs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return recs[:limit]


# ============= Agent runner =============

async def run_analysis_agent(market: str, model: Optional[str] = None) -> list[Recommendation]:
    """
    Run the recommendation agent for a specific market.
    This is a placeholder that generates sample recommendations.
    The actual agent implementation is in agent/recommendation_agent.py
    """
    from agent.recommendation_agent import RecommendationAgent

    # Update status
    analysis_status[market] = AnalysisStatus(
        status="running",
        market=market,
        started_at=datetime.now().isoformat(),
    )

    try:
        agent = RecommendationAgent(market=market, model_override=model)
        recommendations = await agent.analyze()

        # Save recommendations
        for rec in recommendations:
            save_recommendation(rec)

        # Update status
        analysis_status[market] = AnalysisStatus(
            status="completed",
            market=market,
            started_at=analysis_status[market].started_at,
            completed_at=datetime.now().isoformat(),
            recommendations_count=len(recommendations),
        )

        return recommendations

    except Exception as e:
        analysis_status[market] = AnalysisStatus(
            status="error",
            market=market,
            started_at=analysis_status[market].started_at,
            completed_at=datetime.now().isoformat(),
            error=str(e),
        )
        raise


# ============= API Endpoints =============

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "ai-recommendation",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/status")
async def get_status():
    """Get analysis status for all markets"""
    return {
        "us": analysis_status["us"].model_dump(),
        "cn": analysis_status["cn"].model_dump(),
    }


@app.get("/status/{market}")
async def get_market_status(market: str):
    """Get analysis status for a specific market"""
    if market not in ["us", "cn"]:
        raise HTTPException(status_code=400, detail="Invalid market. Use 'us' or 'cn'.")
    return analysis_status[market].model_dump()


@app.post("/analyze")
async def trigger_analysis(req: AnalysisRequest, background_tasks: BackgroundTasks):
    """Trigger analysis for a specific market (runs in background)"""
    if req.market not in ["us", "cn"]:
        raise HTTPException(status_code=400, detail="Invalid market. Use 'us' or 'cn'.")

    if analysis_status[req.market].status == "running":
        raise HTTPException(status_code=409, detail=f"Analysis already running for {req.market}")

    # Run in background
    background_tasks.add_task(run_analysis_agent, req.market, req.model)

    return {
        "status": "started",
        "market": req.market,
        "model": req.model,
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/analyze/sync")
async def trigger_analysis_sync(req: AnalysisRequest):
    """Trigger analysis synchronously (waits for completion)"""
    if req.market not in ["us", "cn"]:
        raise HTTPException(status_code=400, detail="Invalid market. Use 'us' or 'cn'.")

    if analysis_status[req.market].status == "running":
        raise HTTPException(status_code=409, detail=f"Analysis already running for {req.market}")

    recommendations = await run_analysis_agent(req.market, req.model)

    return {
        "status": "completed",
        "market": req.market,
        "recommendations": [r.model_dump() for r in recommendations],
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/recommendations")
async def get_recommendations(
    market: Optional[str] = Query(None, description="Filter by market: 'us' or 'cn'"),
    limit: int = Query(50, ge=1, le=200, description="Max recommendations to return"),
):
    """Get recent recommendations"""
    if market is not None and market not in ["us", "cn"]:
        raise HTTPException(status_code=400, detail="Invalid market. Use 'us' or 'cn'.")

    recs = load_recommendations(market=market, limit=limit)

    return {
        "recommendations": recs,
        "count": len(recs),
        "market": market,
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/accuracy")
async def get_accuracy(
    market: Optional[str] = Query(None, description="Filter by market"),
    days: int = Query(30, ge=1, le=365, description="Period in days"),
):
    """Get historical accuracy statistics"""
    from agent.accuracy import calculate_accuracy

    try:
        stats = await calculate_accuracy(market=market, days=days)
        return stats
    except Exception as e:
        import logging
        logging.exception("Accuracy calculation failed")
        # Return placeholder with error info if accuracy calculation fails
        return {
            "total": 0,
            "hits": 0,
            "misses": 0,
            "pending": 0,
            "accuracy": 0.0,
            "period_days": days,
            "error": str(e),
            "details": [],
        }


@app.delete("/recommendations/clear")
async def clear_recommendations(
    market: Optional[str] = Query(None, description="Clear only this market"),
):
    """Clear recommendation history"""
    if market is not None and market not in ["us", "cn"]:
        raise HTTPException(status_code=400, detail="Invalid market. Use 'us' or 'cn'.")

    if not RECOMMENDATIONS_FILE.exists():
        return {"status": "ok", "message": "No recommendations to clear"}

    if market is None:
        # Clear all
        RECOMMENDATIONS_FILE.unlink()
        return {"status": "ok", "message": "All recommendations cleared"}

    # Filter out the specified market
    recs = []
    with open(RECOMMENDATIONS_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
                if rec.get("market") != market:
                    recs.append(rec)
            except json.JSONDecodeError:
                continue

    # Rewrite file
    with open(RECOMMENDATIONS_FILE, "w", encoding="utf-8") as f:
        for rec in recs:
            f.write(json.dumps(rec) + "\n")

    return {
        "status": "ok",
        "message": f"Cleared {market} recommendations",
        "remaining": len(recs),
    }


# ============= Main =============

if __name__ == "__main__":
    import uvicorn

    print(f"Starting AI Recommendation Service on {SERVICE_HOST}:{SERVICE_PORT}")
    uvicorn.run(app, host=SERVICE_HOST, port=SERVICE_PORT)
