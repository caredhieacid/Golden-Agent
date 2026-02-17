"""
金策智显 - FastAPI 主入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import get_settings
from .database import init_db
from .routers import health, congress, stocks, gold

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理：启动时初始化数据库"""
    init_db()
    print("✅ 数据库初始化完成")
    yield
    print("👋 应用关闭")


app = FastAPI(
    title=settings.APP_NAME,
    description="全球投资情报平台 API - 追踪国会交易、A股行情、黄金价格",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(health.router, prefix="/api", tags=["健康检查"])
app.include_router(congress.router, prefix="/api/congress", tags=["国会交易"])
app.include_router(stocks.router, prefix="/api/stocks", tags=["A股市场"])
app.include_router(gold.router, prefix="/api/gold", tags=["黄金市场"])
