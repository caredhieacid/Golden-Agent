"""
A 股数据服务
使用 AKShare 获取 A 股实时行情、指数、板块数据
"""
import time
from typing import Optional
from ..models import StockIndexResponse, StockItemResponse, SectorResponse


class StockService:
    """A 股数据获取与缓存"""

    # 内存缓存
    _cache: dict = {}
    _cache_ts: dict = {}

    # 缓存 TTL（秒）
    CACHE_TTL = {
        "indices": 60,     # 指数 1 分钟
        "hot": 60,         # 排行 1 分钟
        "sectors": 60,     # 板块 1 分钟
        "detail": 60,      # 个股 1 分钟
    }

    # 关注的主要指数代码
    MAIN_INDICES = ["上证指数", "深证成指", "创业板指", "沪深300", "中证500", "科创50"]

    def _is_cache_valid(self, key: str) -> bool:
        """检查缓存是否有效"""
        if key not in self._cache or key not in self._cache_ts:
            return False
        ttl_category = key.split(":")[0]
        ttl = self.CACHE_TTL.get(ttl_category, 300)
        return (time.time() - self._cache_ts[key]) < ttl

    def _set_cache(self, key: str, data):
        """设置缓存"""
        self._cache[key] = data
        self._cache_ts[key] = time.time()

    def get_indices(self) -> list[StockIndexResponse]:
        """获取 A 股主要指数"""
        cache_key = "indices:main"
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        try:
            import akshare as ak
            # 通过 AKShare 获取实时指数行情
            df = ak.stock_zh_index_spot_em()

            results = []
            for _, row in df.iterrows():
                name = row.get("名称", "")
                if name in self.MAIN_INDICES:
                    results.append(StockIndexResponse(
                        code=str(row.get("代码", "")),
                        name=name,
                        price=self._safe_float(row.get("最新价")),
                        change_pct=self._safe_float(row.get("涨跌幅")),
                        change_amount=self._safe_float(row.get("涨跌额")),
                        volume=self._safe_float(row.get("成交量")),
                        amount=self._safe_float(row.get("成交额")),
                    ))

            # 按 MAIN_INDICES 的顺序排序
            order = {name: i for i, name in enumerate(self.MAIN_INDICES)}
            results.sort(key=lambda x: order.get(x.name, 999))

            self._set_cache(cache_key, results)
            return results

        except ImportError:
            return self._get_sample_indices()
        except Exception as e:
            print(f"⚠️ AKShare 获取指数失败: {e}")
            return self._get_sample_indices()

    def get_hot_stocks(self, sort_by: str = "change_pct_desc", limit: int = 20) -> list[StockItemResponse]:
        """获取 A 股排行榜"""
        cache_key = f"hot:{sort_by}:{limit}"
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        try:
            import akshare as ak
            df = ak.stock_zh_a_spot_em()

            # 排序
            if sort_by == "change_pct_desc":
                df = df.sort_values("涨跌幅", ascending=False)
            elif sort_by == "change_pct_asc":
                df = df.sort_values("涨跌幅", ascending=True)
            elif sort_by == "amount_desc":
                df = df.sort_values("成交额", ascending=False)

            df = df.head(limit)

            results = [
                StockItemResponse(
                    code=str(row.get("代码", "")),
                    name=str(row.get("名称", "")),
                    price=self._safe_float(row.get("最新价")),
                    change_pct=self._safe_float(row.get("涨跌幅")),
                    change_amount=self._safe_float(row.get("涨跌额")),
                    volume=self._safe_float(row.get("成交量")),
                    amount=self._safe_float(row.get("成交额")),
                    high=self._safe_float(row.get("最高")),
                    low=self._safe_float(row.get("最低")),
                    open=self._safe_float(row.get("今开")),
                    turnover_rate=self._safe_float(row.get("换手率")),
                    pe_ratio=self._safe_float(row.get("市盈率-动态")),
                )
                for _, row in df.iterrows()
            ]

            self._set_cache(cache_key, results)
            return results

        except ImportError:
            return self._get_sample_stocks(limit)
        except Exception as e:
            print(f"⚠️ AKShare 获取行情失败: {e}")
            return self._get_sample_stocks(limit)

    def get_sectors(self, limit: int = 20) -> list[SectorResponse]:
        """获取行业板块涨跌排行"""
        cache_key = f"sectors:{limit}"
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        try:
            import akshare as ak
            df = ak.stock_board_industry_name_em()
            df = df.sort_values("涨跌幅", ascending=False).head(limit)

            results = [
                SectorResponse(
                    name=str(row.get("板块名称", "")),
                    change_pct=self._safe_float(row.get("涨跌幅")),
                    leader_stock=str(row.get("领涨股票", "")),
                    leader_change_pct=self._safe_float(row.get("领涨股票-涨跌幅")),
                )
                for _, row in df.iterrows()
            ]

            self._set_cache(cache_key, results)
            return results

        except ImportError:
            return self._get_sample_sectors(limit)
        except Exception as e:
            print(f"⚠️ AKShare 获取板块失败: {e}")
            return self._get_sample_sectors(limit)

    def get_stock_detail(self, code: str) -> Optional[dict]:
        """获取个股详情"""
        cache_key = f"detail:{code}"
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        try:
            import akshare as ak
            # 获取个股实时行情
            df = ak.stock_zh_a_spot_em()
            stock = df[df["代码"] == code]

            if stock.empty:
                return None

            row = stock.iloc[0]

            result = {
                "code": code,
                "name": str(row.get("名称", "")),
                "price": self._safe_float(row.get("最新价")),
                "change_pct": self._safe_float(row.get("涨跌幅")),
                "change_amount": self._safe_float(row.get("涨跌额")),
                "volume": self._safe_float(row.get("成交量")),
                "amount": self._safe_float(row.get("成交额")),
                "high": self._safe_float(row.get("最高")),
                "low": self._safe_float(row.get("最低")),
                "open": self._safe_float(row.get("今开")),
                "turnover_rate": self._safe_float(row.get("换手率")),
                "pe_ratio": self._safe_float(row.get("市盈率-动态")),
                "total_market_value": self._safe_float(row.get("总市值")),
                "circulating_market_value": self._safe_float(row.get("流通市值")),
            }

            self._set_cache(cache_key, result)
            return result

        except ImportError:
            return self._get_sample_stock_detail(code)
        except Exception as e:
            print(f"⚠️ AKShare 获取个股失败: {e}")
            return self._get_sample_stock_detail(code)

    @staticmethod
    def _safe_float(val) -> Optional[float]:
        """安全转换为浮点数"""
        if val is None or str(val) in ["", "nan", "-", "--"]:
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    # ========== 示例数据（AKShare 不可用时降级） ==========

    def _get_sample_indices(self) -> list[StockIndexResponse]:
        return [
            StockIndexResponse(code="000001", name="上证指数", price=3328.56, change_pct=-0.32, change_amount=-10.72, volume=31256432000, amount=389678900000),
            StockIndexResponse(code="399001", name="深证成指", price=10523.87, change_pct=-0.48, change_amount=-50.82, volume=38678123000, amount=506789000000),
            StockIndexResponse(code="399006", name="创业板指", price=2156.33, change_pct=-0.65, change_amount=-14.11, volume=14345678000, amount=198900000000),
            StockIndexResponse(code="000300", name="沪深300", price=3892.45, change_pct=-0.27, change_amount=-10.54, volume=17678900000, amount=274567000000),
            StockIndexResponse(code="000905", name="中证500", price=8245.19, change_pct=-1.12, change_amount=-93.42, volume=9765432000, amount=143456000000),
            StockIndexResponse(code="000688", name="科创50", price=1078.92, change_pct=0.86, change_amount=9.20, volume=5567890000, amount=99012000000),
        ]

    def _get_sample_stocks(self, limit: int) -> list[StockItemResponse]:
        samples = [
            StockItemResponse(code="600519", name="贵州茅台", price=1580.0, change_pct=2.35, high=1590.0, low=1550.0, amount=3456789000),
            StockItemResponse(code="000858", name="五粮液", price=132.5, change_pct=1.89, high=133.8, low=130.2, amount=2345678000),
            StockItemResponse(code="601318", name="中国平安", price=42.8, change_pct=-0.93, high=43.5, low=42.5, amount=1987654000),
            StockItemResponse(code="000001", name="平安银行", price=10.25, change_pct=0.59, high=10.35, low=10.15, amount=987654000),
            StockItemResponse(code="002594", name="比亚迪", price=286.5, change_pct=3.21, high=289.0, low=278.0, amount=4567890000),
        ]
        return samples[:limit]

    def _get_sample_sectors(self, limit: int) -> list[SectorResponse]:
        samples = [
            SectorResponse(name="半导体", change_pct=3.45, leader_stock="北方华创", leader_change_pct=8.92),
            SectorResponse(name="人工智能", change_pct=2.89, leader_stock="科大讯飞", leader_change_pct=7.56),
            SectorResponse(name="新能源汽车", change_pct=2.12, leader_stock="比亚迪", leader_change_pct=3.21),
            SectorResponse(name="白酒", change_pct=1.78, leader_stock="贵州茅台", leader_change_pct=2.35),
            SectorResponse(name="光伏", change_pct=1.45, leader_stock="隆基绿能", leader_change_pct=4.67),
            SectorResponse(name="医药生物", change_pct=-0.23, leader_stock="恒瑞医药", leader_change_pct=1.02),
            SectorResponse(name="房地产", change_pct=-1.56, leader_stock="万科A", leader_change_pct=-0.89),
        ]
        return samples[:limit]

    def _get_sample_stock_detail(self, code: str) -> Optional[dict]:
        return {
            "code": code,
            "name": f"股票{code}",
            "price": 100.0,
            "change_pct": 1.5,
            "change_amount": 1.5,
            "volume": 10000000,
            "amount": 1000000000,
            "high": 102.0,
            "low": 98.0,
            "open": 99.0,
            "turnover_rate": 2.5,
            "pe_ratio": 15.0,
            "total_market_value": 50000000000,
            "circulating_market_value": 40000000000,
        }
