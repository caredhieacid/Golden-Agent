"""
国会交易 API 路由
"""
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func, col
from typing import Optional
from datetime import date, timedelta

from ..database import get_session
from ..models import CongressTrade, Politician, TradeResponse, PoliticianResponse
from ..services.congress_service import CongressService

router = APIRouter()
congress_service = CongressService()


@router.get("/trades", response_model=list[TradeResponse])
def get_trades(
    days: int = Query(default=90, ge=1, le=365, description="查询最近N天的交易"),
    transaction_type: Optional[str] = Query(default=None, description="交易类型: purchase/sale"),
    ticker: Optional[str] = Query(default=None, description="股票代码"),
    limit: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_session),
):
    """获取国会交易列表"""
    cutoff = date.today() - timedelta(days=days)

    query = select(CongressTrade).where(
        col(CongressTrade.transaction_date) >= cutoff
    )

    if transaction_type:
        query = query.where(CongressTrade.transaction_type == transaction_type)
    if ticker:
        query = query.where(CongressTrade.ticker == ticker.upper())

    query = query.order_by(col(CongressTrade.transaction_date).desc()).limit(limit)
    trades = session.exec(query).all()

    return [
        TradeResponse(
            id=t.id,
            politician_name=t.politician_name,
            politician_party=t.politician_party,
            politician_state=t.politician_state,
            chamber=t.source_chamber,
            ticker=t.ticker,
            company_name=t.company_name,
            transaction_type=t.transaction_type,
            amount_min=t.amount_min,
            amount_max=t.amount_max,
            transaction_date=t.transaction_date,
            disclosure_date=t.disclosure_date,
        )
        for t in trades
    ]


@router.get("/politicians", response_model=list[PoliticianResponse])
def get_politicians(
    chamber: Optional[str] = Query(default=None, description="house/senate"),
    limit: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_session),
):
    """获取活跃议员列表"""
    query = select(Politician).where(Politician.active == True)

    if chamber:
        query = query.where(Politician.chamber == chamber.lower())

    query = query.limit(limit)
    politicians = session.exec(query).all()

    # 统计每个议员的交易数量
    results = []
    for p in politicians:
        trade_count_query = select(func.count(CongressTrade.id)).where(
            CongressTrade.politician_id == p.id
        )
        trade_count = session.exec(trade_count_query).one()

        last_trade_query = (
            select(CongressTrade.transaction_date)
            .where(CongressTrade.politician_id == p.id)
            .order_by(col(CongressTrade.transaction_date).desc())
            .limit(1)
        )
        last_trade = session.exec(last_trade_query).first()

        results.append(
            PoliticianResponse(
                id=p.id,
                full_name=p.full_name,
                chamber=p.chamber,
                state=p.state,
                party=p.party,
                trade_count=trade_count,
                last_trade_date=last_trade,
            )
        )

    return results


@router.get("/politicians/{politician_id}")
def get_politician_detail(
    politician_id: int,
    session: Session = Depends(get_session),
):
    """获取议员详情和交易历史"""
    politician = session.get(Politician, politician_id)
    if not politician:
        return {"error": "议员不存在"}

    trades = session.exec(
        select(CongressTrade)
        .where(CongressTrade.politician_id == politician_id)
        .order_by(col(CongressTrade.transaction_date).desc())
        .limit(100)
    ).all()

    return {
        "politician": {
            "id": politician.id,
            "full_name": politician.full_name,
            "chamber": politician.chamber,
            "state": politician.state,
            "party": politician.party,
        },
        "trades": [
            TradeResponse(
                id=t.id,
                politician_name=t.politician_name,
                ticker=t.ticker,
                company_name=t.company_name,
                transaction_type=t.transaction_type,
                amount_min=t.amount_min,
                amount_max=t.amount_max,
                transaction_date=t.transaction_date,
                disclosure_date=t.disclosure_date,
            )
            for t in trades
        ],
        "total_trades": len(trades),
    }


@router.get("/hot-stocks")
def get_hot_stocks(
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=10, ge=1, le=50),
    session: Session = Depends(get_session),
):
    """获取被最多议员交易的热门股票"""
    cutoff = date.today() - timedelta(days=days)

    results = session.exec(
        select(
            CongressTrade.ticker,
            func.count(CongressTrade.id).label("trade_count"),
        )
        .where(col(CongressTrade.transaction_date) >= cutoff)
        .group_by(CongressTrade.ticker)
        .order_by(func.count(CongressTrade.id).desc())
        .limit(limit)
    ).all()

    return [
        {"ticker": ticker, "trade_count": count}
        for ticker, count in results
    ]


@router.get("/sync")
def sync_congress_data(session: Session = Depends(get_session)):
    """手动触发数据同步（开发用）"""
    result = congress_service.sync_data(session)
    return result
