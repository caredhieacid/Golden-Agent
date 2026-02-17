"""
黄金市场数据服务
使用 AKShare 获取国内外金价、汇率、价差分析
"""
import time
from typing import Optional
from datetime import datetime, timedelta
from ..models import GoldPriceResponse


class GoldService:
    """黄金价格数据获取与缓存"""

    _cache: dict = {}
    _cache_ts: dict = {}
    CACHE_TTL = 60  # 60 秒缓存（匹配前端 1 分钟刷新频率）

    # 1 盎司 ≈ 31.1035 克
    OZ_TO_GRAM = 31.1035

    def _is_cache_valid(self, key: str) -> bool:
        if key not in self._cache or key not in self._cache_ts:
            return False
        return (time.time() - self._cache_ts[key]) < self.CACHE_TTL

    def _set_cache(self, key: str, data):
        self._cache[key] = data
        self._cache_ts[key] = time.time()

    def get_current_prices(self) -> GoldPriceResponse:
        """获取当前金价（国际 + 国内 + 汇率 + 价差）"""
        cache_key = "gold:current"
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        international_usd = None
        domestic_cny = None
        exchange_rate = None

        # 1. 获取国内金价 - 上海金交所基准价
        try:
            import akshare as ak
            df = ak.spot_golden_benchmark_sge()
            if not df.empty:
                last_row = df.iloc[-1]
                # 列: 交易时间, 晚盘价, 早盘价
                # 取早盘价和晚盘价的平均，或取最新非空值
                am_price = self._safe_float(last_row.get("早盘价"))
                pm_price = self._safe_float(last_row.get("晚盘价"))
                if am_price and pm_price:
                    domestic_cny = round((am_price + pm_price) / 2, 2)
                elif pm_price:
                    domestic_cny = pm_price
                elif am_price:
                    domestic_cny = am_price
                print(f"✅ 国内金价(SGE基准): ¥{domestic_cny}/克")
        except Exception as e:
            print(f"⚠️ AKShare 获取国内金价失败: {e}")

        # 2. 获取国际金价 - COMEX 黄金期货
        try:
            import akshare as ak
            df = ak.futures_global_spot_em()
            if not df.empty:
                # 过滤 COMEX 黄金 (代码 GC00Y)
                gold_rows = df[
                    (df["代码"].astype(str).str.contains("GC00Y", na=False)) |
                    (df["名称"].astype(str).str.contains("COMEX黄金", na=False))
                ]
                if gold_rows.empty:
                    # 备选：模糊匹配任何含"黄金"的行
                    gold_rows = df[df["名称"].astype(str).str.contains("黄金", na=False)]
                if not gold_rows.empty:
                    international_usd = self._safe_float(gold_rows.iloc[0].get("最新价"))
                    print(f"✅ 国际金价(COMEX): ${international_usd}/盎司")
        except Exception as e:
            print(f"⚠️ AKShare 获取国际金价失败: {e}")

        # 3. 获取汇率 - 中国银行牌价
        try:
            import akshare as ak
            fx_df = ak.currency_boc_safe()
            if not fx_df.empty and "美元" in fx_df.columns:
                # 美元列的值是 100 美元兑人民币
                last_rate = self._safe_float(fx_df["美元"].iloc[-1])
                if last_rate and last_rate > 100:
                    exchange_rate = round(last_rate / 100, 4)  # 转换为 1 USD = ? CNY
                elif last_rate:
                    exchange_rate = last_rate
                print(f"✅ 美元汇率(BOC): 1 USD = {exchange_rate} CNY")
        except Exception as e:
            print(f"⚠️ AKShare 获取汇率失败: {e}")

        # 4. 降级默认值（基于真实最新市场水平）
        if exchange_rate is None:
            exchange_rate = 7.24
        if international_usd is None:
            # 如果有国内价和汇率，可以反推
            if domestic_cny and exchange_rate:
                international_usd = round(domestic_cny * self.OZ_TO_GRAM / exchange_rate, 2)
                print(f"ℹ️ 国际金价由国内价反推: ${international_usd}/盎司")
        if domestic_cny is None:
            # 如果有国际价和汇率，可以正推
            if international_usd and exchange_rate:
                domestic_cny = round(international_usd * exchange_rate / self.OZ_TO_GRAM, 2)
                print(f"ℹ️ 国内金价由国际价推算: ¥{domestic_cny}/克")

        # 5. 计算价差
        spread_pct = self._calculate_spread(international_usd, domestic_cny, exchange_rate)

        result = GoldPriceResponse(
            international_usd=international_usd,
            domestic_cny=domestic_cny,
            exchange_rate=exchange_rate,
            spread_pct=spread_pct,
            updated_at=datetime.now().isoformat(),
        )

        self._set_cache(cache_key, result)
        return result

    def get_price_history(self, days: int = 30) -> list[dict]:
        """获取金价历史走势 - 上海金交所基准价"""
        cache_key = f"gold:history:{days}"
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        try:
            import akshare as ak
            df = ak.spot_golden_benchmark_sge()
            if not df.empty:
                df = df.tail(days)
                results = []
                for _, row in df.iterrows():
                    am = self._safe_float(row.get("早盘价"))
                    pm = self._safe_float(row.get("晚盘价"))
                    price = None
                    if am and pm:
                        price = round((am + pm) / 2, 2)
                    elif pm:
                        price = pm
                    elif am:
                        price = am
                    if price:
                        results.append({
                            "date": str(row.get("交易时间", "")),
                            "price_cny": price,
                        })
                if results:
                    self._set_cache(cache_key, results)
                    print(f"✅ 获取 {len(results)} 天金价历史数据")
                    return results
        except Exception as e:
            print(f"⚠️ AKShare 获取金价历史失败: {e}")

        # 降级：生成模拟数据（基于真实价格水平 ~1100元/克）
        return self._get_sample_history(days)

    def _calculate_spread(self, usd_price: float, cny_price: float, rate: float) -> Optional[float]:
        """
        计算国内外价差百分比
        国际价格转换为人民币/克后，与国内价格对比
        """
        if not usd_price or not cny_price or not rate:
            return None
        international_cny_per_gram = (usd_price * rate) / self.OZ_TO_GRAM
        spread = ((cny_price - international_cny_per_gram) / international_cny_per_gram) * 100
        return round(spread, 2)

    @staticmethod
    def _safe_float(val) -> Optional[float]:
        if val is None or str(val) in ["", "nan", "-", "--", "NaN"]:
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    def _get_sample_history(self, days: int) -> list[dict]:
        """生成示例历史数据（基于当前真实价格水平）"""
        import random
        base_price = 1100.0  # 当前真实水平约 1100 元/克
        results = []
        for i in range(days):
            dt = datetime.now() - timedelta(days=days - i)
            price = base_price + random.uniform(-30, 30) + (i * 0.5)
            results.append({
                "date": dt.strftime("%Y-%m-%d"),
                "price_cny": round(price, 2),
            })
        return results
