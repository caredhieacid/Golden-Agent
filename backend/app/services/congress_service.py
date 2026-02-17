"""
国会交易数据服务
负责从数据源获取、解析和同步国会议员交易数据
"""
import csv
import io
import os
import zipfile
import requests
from typing import Optional
from datetime import datetime, date
from sqlmodel import Session, select, col

from ..models import CongressTrade, Politician


class CongressService:
    """国会交易数据获取与同步"""

    # 众议院公开披露的索引文件 URL
    HOUSE_INDEX_URL = "https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{year}FD.ZIP"
    DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "house")

    # 金额范围映射（提供给前端展示）
    AMOUNT_RANGES = {
        "$1,001 - $15,000": (1001, 15000),
        "$15,001 - $50,000": (15001, 50000),
        "$50,001 - $100,000": (50001, 100000),
        "$100,001 - $250,000": (100001, 250000),
        "$250,001 - $500,000": (250001, 500000),
        "$500,001 - $1,000,000": (500001, 1000000),
        "$1,000,001 - $5,000,000": (1000001, 5000000),
        "$5,000,001 - $25,000,000": (5000001, 25000000),
        "$25,000,001 - $50,000,000": (25000001, 50000000),
        "Over $50,000,000": (50000001, 100000000),
    }

    def __init__(self):
        os.makedirs(self.DATA_DIR, exist_ok=True)

    def sync_data(self, session: Session) -> dict:
        """
        同步国会交易数据到本地数据库。
        优先尝试解析众议院索引文件，失败时使用示例数据。
        """
        year = datetime.now().year
        try:
            trades = self._fetch_house_index(year)
            if not trades:
                # 如果当年没有数据，尝试去年
                trades = self._fetch_house_index(year - 1)

            if trades:
                saved = self._save_trades(session, trades)
                return {"status": "ok", "source": "house_index", "trades_saved": saved}
        except Exception as e:
            print(f"⚠️ 从众议院获取数据失败: {e}")

        # 降级方案：插入示例数据供开发调试
        saved = self._insert_sample_data(session)
        return {"status": "ok", "source": "sample_data", "trades_saved": saved}

    def _fetch_house_index(self, year: int) -> list[dict]:
        """
        下载并解析众议院年度索引文件。
        索引文件是 TAB 分隔格式，包含所有交易报告的元数据。
        """
        zip_url = self.HOUSE_INDEX_URL.format(year=year)
        txt_path = os.path.join(self.DATA_DIR, f"{year}FD.txt")

        # 检查本地缓存
        if not os.path.exists(txt_path):
            print(f"📥 下载索引文件: {zip_url}")
            try:
                resp = requests.get(zip_url, timeout=30)
                resp.raise_for_status()
            except requests.RequestException as e:
                print(f"下载失败: {e}")
                return []

            zip_path = os.path.join(self.DATA_DIR, f"{year}.zip")
            with open(zip_path, "wb") as f:
                f.write(resp.content)

            with zipfile.ZipFile(zip_path) as z:
                z.extractall(self.DATA_DIR)

        # 解析 TAB 分隔索引
        if not os.path.exists(txt_path):
            return []

        trades = []
        with open(txt_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.reader(f, delimiter="\t")
            for row in reader:
                if len(row) < 9:
                    continue
                try:
                    trades.append({
                        "name": row[1].strip(),
                        "state": row[4].strip() if len(row) > 4 else "",
                        "district": row[5].strip() if len(row) > 5 else "",
                        "doc_id": row[8].strip(),
                        "transaction_date": row[7].strip() if len(row) > 7 else None,
                        "filing_date": row[9].strip() if len(row) > 9 else None,
                    })
                except (IndexError, ValueError):
                    continue

        return trades

    def _save_trades(self, session: Session, trades: list[dict]) -> int:
        """批量保存交易记录到数据库"""
        count = 0
        for trade_data in trades:
            # 检查是否已存在
            existing = session.exec(
                select(CongressTrade).where(
                    CongressTrade.doc_id == trade_data.get("doc_id")
                )
            ).first()

            if existing:
                continue

            name = trade_data.get("name", "")
            # 确保议员存在
            politician = self._ensure_politician(session, name, trade_data)

            trade = CongressTrade(
                politician_id=politician.id if politician else None,
                ticker="N/A",  # 索引文件不含 ticker，需要解析 PDF 才有
                transaction_type="unknown",
                source_chamber="house",
                doc_id=trade_data.get("doc_id"),
                politician_name=name,
                politician_state=trade_data.get("state"),
                transaction_date=self._parse_date(trade_data.get("transaction_date")),
                disclosure_date=self._parse_date(trade_data.get("filing_date")),
            )
            session.add(trade)
            count += 1

        session.commit()
        return count

    def _ensure_politician(self, session: Session, name: str, data: dict) -> Optional[Politician]:
        """确保议员记录存在，不存在则创建"""
        if not name:
            return None

        politician = session.exec(
            select(Politician).where(Politician.full_name == name)
        ).first()

        if not politician:
            parts = name.split()
            politician = Politician(
                first_name=parts[0] if parts else "",
                last_name=parts[-1] if parts else "",
                full_name=name,
                chamber="house",
                state=data.get("state", ""),
                active=True,
            )
            session.add(politician)
            session.commit()
            session.refresh(politician)

        return politician

    def _parse_date(self, date_str: Optional[str]) -> Optional[date]:
        """解析日期字符串"""
        if not date_str:
            return None
        for fmt in ["%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y"]:
            try:
                return datetime.strptime(date_str.strip(), fmt).date()
            except ValueError:
                continue
        return None

    def _insert_sample_data(self, session: Session) -> int:
        """
        插入示例数据用于开发和演示。
        当无法从实际数据源获取数据时使用。
        """
        # 检查是否已有数据
        existing_count = session.exec(
            select(CongressTrade).limit(1)
        ).first()
        if existing_count:
            return 0

        # 示例议员
        sample_politicians = [
            Politician(first_name="Nancy", last_name="Pelosi", full_name="Nancy Pelosi",
                       chamber="house", state="CA", party="D", active=True),
            Politician(first_name="Dan", last_name="Crenshaw", full_name="Dan Crenshaw",
                       chamber="house", state="TX", party="R", active=True),
            Politician(first_name="Tommy", last_name="Tuberville", full_name="Tommy Tuberville",
                       chamber="senate", state="AL", party="R", active=True),
            Politician(first_name="Mark", last_name="Green", full_name="Mark Green",
                       chamber="house", state="TN", party="R", active=True),
            Politician(first_name="Josh", last_name="Gottheimer", full_name="Josh Gottheimer",
                       chamber="house", state="NJ", party="D", active=True),
        ]
        for p in sample_politicians:
            session.add(p)
        session.commit()
        for p in sample_politicians:
            session.refresh(p)

        # 示例交易数据
        sample_trades = [
            CongressTrade(
                politician_id=sample_politicians[0].id,
                ticker="NVDA", company_name="NVIDIA Corporation",
                transaction_type="purchase", amount_min=1000001, amount_max=5000000,
                transaction_date=date(2025, 12, 15), disclosure_date=date(2026, 1, 10),
                source_chamber="house", politician_name="Nancy Pelosi",
                politician_party="D", politician_state="CA",
            ),
            CongressTrade(
                politician_id=sample_politicians[0].id,
                ticker="AAPL", company_name="Apple Inc.",
                transaction_type="sale", amount_min=500001, amount_max=1000000,
                transaction_date=date(2025, 11, 20), disclosure_date=date(2025, 12, 5),
                source_chamber="house", politician_name="Nancy Pelosi",
                politician_party="D", politician_state="CA",
            ),
            CongressTrade(
                politician_id=sample_politicians[1].id,
                ticker="MSFT", company_name="Microsoft Corporation",
                transaction_type="purchase", amount_min=100001, amount_max=250000,
                transaction_date=date(2026, 1, 5), disclosure_date=date(2026, 1, 20),
                source_chamber="house", politician_name="Dan Crenshaw",
                politician_party="R", politician_state="TX",
            ),
            CongressTrade(
                politician_id=sample_politicians[2].id,
                ticker="TSLA", company_name="Tesla Inc.",
                transaction_type="sale_partial", amount_min=250001, amount_max=500000,
                transaction_date=date(2026, 1, 10), disclosure_date=date(2026, 1, 25),
                source_chamber="senate", politician_name="Tommy Tuberville",
                politician_party="R", politician_state="AL",
            ),
            CongressTrade(
                politician_id=sample_politicians[3].id,
                ticker="GOOG", company_name="Alphabet Inc.",
                transaction_type="purchase", amount_min=50001, amount_max=100000,
                transaction_date=date(2026, 1, 12), disclosure_date=date(2026, 1, 28),
                source_chamber="house", politician_name="Mark Green",
                politician_party="R", politician_state="TN",
            ),
            CongressTrade(
                politician_id=sample_politicians[4].id,
                ticker="AMZN", company_name="Amazon.com Inc.",
                transaction_type="purchase", amount_min=15001, amount_max=50000,
                transaction_date=date(2026, 2, 1), disclosure_date=date(2026, 2, 10),
                source_chamber="house", politician_name="Josh Gottheimer",
                politician_party="D", politician_state="NJ",
            ),
            CongressTrade(
                politician_id=sample_politicians[1].id,
                ticker="META", company_name="Meta Platforms Inc.",
                transaction_type="purchase", amount_min=100001, amount_max=250000,
                transaction_date=date(2026, 2, 5), disclosure_date=date(2026, 2, 14),
                source_chamber="house", politician_name="Dan Crenshaw",
                politician_party="R", politician_state="TX",
            ),
            CongressTrade(
                politician_id=sample_politicians[2].id,
                ticker="JPM", company_name="JPMorgan Chase & Co.",
                transaction_type="sale_full", amount_min=500001, amount_max=1000000,
                transaction_date=date(2026, 1, 22), disclosure_date=date(2026, 2, 8),
                source_chamber="senate", politician_name="Tommy Tuberville",
                politician_party="R", politician_state="AL",
            ),
        ]
        for t in sample_trades:
            session.add(t)
        session.commit()

        return len(sample_trades)
