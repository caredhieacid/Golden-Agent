"""
数据模型定义
使用 SQLModel（Pydantic + SQLAlchemy）
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime, date


# =============================================
# 议员
# =============================================
class Politician(SQLModel, table=True):
    """美国国会议员"""
    id: Optional[int] = Field(default=None, primary_key=True)
    first_name: str
    last_name: str
    full_name: str = Field(index=True)
    chamber: str = Field(index=True)   # 'house' / 'senate'
    state: str = Field(max_length=2)
    party: Optional[str] = None        # 'D' / 'R' / 'I'
    district: Optional[int] = None
    active: bool = Field(default=True, index=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)


# =============================================
# 国会交易记录
# =============================================
class CongressTrade(SQLModel, table=True):
    """国会议员股票交易记录"""
    id: Optional[int] = Field(default=None, primary_key=True)
    politician_id: Optional[int] = Field(default=None, foreign_key="politician.id", index=True)

    # 股票信息
    ticker: str = Field(index=True)
    company_name: Optional[str] = None

    # 交易详情
    transaction_type: str = Field(index=True)  # 'purchase' / 'sale' / 'sale_partial' / 'sale_full'
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None

    # 日期
    transaction_date: Optional[date] = Field(default=None, index=True)
    disclosure_date: Optional[date] = Field(default=None, index=True)

    # 来源
    source_chamber: str = "house"  # 'house' / 'senate'
    doc_id: Optional[str] = None
    source_url: Optional[str] = None

    # 议员冗余信息（方便查询，避免每次 JOIN）
    politician_name: Optional[str] = None
    politician_party: Optional[str] = None
    politician_state: Optional[str] = None

    created_at: Optional[datetime] = Field(default_factory=datetime.now)


# =============================================
# 黄金价格快照
# =============================================
class GoldPrice(SQLModel, table=True):
    """黄金价格历史记录"""
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.now, index=True)

    # 国际金价（美元/盎司）
    international_usd: Optional[float] = None
    # 国内金价（人民币/克）
    domestic_cny: Optional[float] = None
    # 美元兑人民币汇率
    exchange_rate: Optional[float] = None
    # 国内外价差百分比
    spread_pct: Optional[float] = None

    source: str = "akshare"  # 数据来源标记


# =============================================
# API 响应模型（不存数据库）
# =============================================
class TradeResponse(SQLModel):
    """交易列表 API 响应项"""
    id: Optional[int] = None
    politician_name: Optional[str] = None
    politician_party: Optional[str] = None
    politician_state: Optional[str] = None
    chamber: Optional[str] = None
    ticker: str
    company_name: Optional[str] = None
    transaction_type: str
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    transaction_date: Optional[date] = None
    disclosure_date: Optional[date] = None


class PoliticianResponse(SQLModel):
    """议员 API 响应"""
    id: Optional[int] = None
    full_name: str
    chamber: str
    state: str
    party: Optional[str] = None
    trade_count: int = 0
    last_trade_date: Optional[date] = None


class GoldPriceResponse(SQLModel):
    """黄金价格 API 响应"""
    international_usd: Optional[float] = None
    domestic_cny: Optional[float] = None
    exchange_rate: Optional[float] = None
    spread_pct: Optional[float] = None
    updated_at: Optional[str] = None


class StockIndexResponse(SQLModel):
    """A 股指数 API 响应"""
    code: str
    name: str
    price: Optional[float] = None
    change_pct: Optional[float] = None
    change_amount: Optional[float] = None
    volume: Optional[float] = None
    amount: Optional[float] = None


class StockItemResponse(SQLModel):
    """A 股个股 API 响应"""
    code: str
    name: str
    price: Optional[float] = None
    change_pct: Optional[float] = None
    change_amount: Optional[float] = None
    volume: Optional[float] = None
    amount: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    open: Optional[float] = None
    turnover_rate: Optional[float] = None
    pe_ratio: Optional[float] = None


class SectorResponse(SQLModel):
    """A 股板块 API 响应"""
    name: str
    change_pct: Optional[float] = None
    leader_stock: Optional[str] = None
    leader_change_pct: Optional[float] = None
