"""
A 股市场 API 路由
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from ..models import StockIndexResponse, StockItemResponse, SectorResponse
from ..services.stock_service import StockService

router = APIRouter()
stock_service = StockService()


@router.get("/indices", response_model=list[StockIndexResponse])
def get_indices():
    """获取 A 股主要指数（上证指数、深证成指、创业板指等）"""
    try:
        return stock_service.get_indices()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"获取指数数据失败: {str(e)}")


@router.get("/hot")
def get_hot_stocks(
    sort_by: str = Query(
        default="change_pct_desc",
        description="排序方式: change_pct_desc(涨幅榜), change_pct_asc(跌幅榜), amount_desc(成交额榜)"
    ),
    limit: int = Query(default=20, ge=1, le=100),
):
    """获取涨幅/跌幅/成交额排行"""
    try:
        return stock_service.get_hot_stocks(sort_by=sort_by, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"获取排行数据失败: {str(e)}")


@router.get("/sectors", response_model=list[SectorResponse])
def get_sectors(
    limit: int = Query(default=20, ge=1, le=100),
):
    """获取行业板块涨跌排行"""
    try:
        return stock_service.get_sectors(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"获取板块数据失败: {str(e)}")


@router.get("/{code}")
def get_stock_detail(
    code: str,
):
    """获取个股详情"""
    try:
        result = stock_service.get_stock_detail(code)
        if not result:
            raise HTTPException(status_code=404, detail=f"未找到股票 {code}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"获取个股数据失败: {str(e)}")
