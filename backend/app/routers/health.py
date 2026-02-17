"""
健康检查路由
"""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "金策智显 API",
        "timestamp": datetime.now().isoformat(),
    }
