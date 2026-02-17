"""
黄金市场 API 路由
"""
from fastapi import APIRouter, Query, HTTPException

from ..models import GoldPriceResponse
from ..services.gold_service import GoldService

router = APIRouter()
gold_service = GoldService()


@router.get("/prices", response_model=GoldPriceResponse)
def get_gold_prices():
    """获取当前国内外金价 + 汇率 + 价差"""
    try:
        return gold_service.get_current_prices()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"获取金价失败: {str(e)}")


@router.get("/history")
def get_gold_history(
    days: int = Query(default=30, ge=1, le=365, description="历史天数"),
):
    """获取金价历史走势"""
    try:
        return gold_service.get_price_history(days=days)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"获取金价历史失败: {str(e)}")
