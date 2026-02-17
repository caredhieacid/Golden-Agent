"""
应用配置管理
使用 pydantic-settings 从环境变量 / .env 文件读取配置
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """全局配置"""

    # 应用
    APP_NAME: str = "金策智显 API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # 数据库 - 默认 SQLite，生产环境可通过环境变量切换 PostgreSQL
    DATABASE_URL: str = "sqlite:///data.db"

    # CORS - 允许的前端源
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # 数据缓存 TTL（秒）
    CACHE_TTL_STOCK: int = 300       # A 股行情 5 分钟
    CACHE_TTL_SECTOR: int = 600      # 板块数据 10 分钟
    CACHE_TTL_INDEX: int = 300       # 指数 5 分钟
    CACHE_TTL_GOLD: int = 1800       # 黄金 30 分钟

    # 可选：GoldAPI.io Key（备选金价数据源）
    GOLDAPI_KEY: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
