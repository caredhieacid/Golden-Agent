"""
数据库连接与会话管理
支持 SQLite（开发）和 PostgreSQL（生产）
"""
from sqlmodel import SQLModel, create_engine, Session
from .config import get_settings

settings = get_settings()

# SQLite 需要 connect_args 参数以支持多线程
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # 开发模式打印 SQL
    connect_args=connect_args,
)


def init_db():
    """创建所有数据表"""
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI 依赖注入：获取数据库会话"""
    with Session(engine) as session:
        yield session
