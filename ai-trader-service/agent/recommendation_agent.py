"""
Recommendation Agent

Analyzes market data and generates investment recommendations
without executing actual trades.
"""

import os
import re
import json
from datetime import datetime
from typing import Optional
from pathlib import Path

import httpx
from openai import AsyncOpenAI

# Import prompts
from prompts import get_prompt, US_MARKET_PROMPT, CN_MARKET_PROMPT

# Configuration
OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gpt-4o")
DATA_PATH = Path(os.getenv("DATA_PATH", "../server/data"))
MAX_RECOMMENDATIONS = int(os.getenv("MAX_RECOMMENDATIONS_PER_RUN", "5"))
GOLDEN_AGENT_API = os.getenv("GOLDEN_AGENT_API", "http://localhost:8000")


class Recommendation:
    """Represents a single investment recommendation with professional analysis"""

    def __init__(
        self,
        market: str,
        ticker: str,
        action: str,
        confidence: float,
        reasoning: str,
        price_target: Optional[float] = None,
        stop_loss: Optional[float] = None,
        # Enhanced fields
        company_name: Optional[str] = None,
        confidence_breakdown: Optional[dict] = None,
        analysis: Optional[dict] = None,
        recommendation_detail: Optional[dict] = None,
        risk_assessment: Optional[dict] = None,
        disclaimer: Optional[str] = None,
    ):
        self.id = f"{market}_{ticker}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        self.market = market
        self.ticker = ticker
        self.company_name = company_name
        self.action = action  # buy | sell | hold
        self.confidence = max(0.0, min(1.0, confidence))
        self.confidence_breakdown = confidence_breakdown or {}
        self.reasoning = reasoning
        self.analysis = analysis or {}
        self.recommendation_detail = recommendation_detail or {}
        self.risk_assessment = risk_assessment or {}
        self.price_target = price_target
        self.stop_loss = stop_loss
        self.disclaimer = disclaimer or "本分析仅供参考，不构成投资建议。投资有风险，入市需谨慎。"
        self.created_at = datetime.now().isoformat()
        # Calculate risk level after all attributes are set
        self.risk_level = self._calc_risk_level()

    def _calc_risk_level(self) -> str:
        """Calculate risk level based on confidence and risk assessment"""
        # Use explicit risk_level from risk_assessment if available
        if self.risk_assessment and "risk_level" in self.risk_assessment:
            level = str(self.risk_assessment["risk_level"]).lower()
            if level in ["低", "low"]:
                return "low"
            elif level in ["中", "medium"]:
                return "medium"
            elif level in ["高", "high"]:
                return "high"

        # Fallback to confidence-based calculation
        if self.confidence < 0.3:
            return "high"
        elif self.confidence < 0.6:
            return "medium"
        return "low"

    def to_dict(self) -> dict:
        result = {
            "id": self.id,
            "market": self.market,
            "ticker": self.ticker,
            "action": self.action,
            "confidence": self.confidence,
            "risk_level": self.risk_level,
            "reasoning": self.reasoning,
            "price_target": self.price_target,
            "stop_loss": self.stop_loss,
            "created_at": self.created_at,
            "disclaimer": self.disclaimer,
        }

        # Add enhanced fields if available
        if self.company_name:
            result["company_name"] = self.company_name
        if self.confidence_breakdown:
            result["confidence_breakdown"] = self.confidence_breakdown
        if self.analysis:
            result["analysis"] = self.analysis
        if self.recommendation_detail:
            result["recommendation_detail"] = self.recommendation_detail
        if self.risk_assessment:
            result["risk_assessment"] = self.risk_assessment

        # Flatten key fields for frontend compatibility
        if self.recommendation_detail:
            if "position_size" in self.recommendation_detail:
                result["position_size"] = self.recommendation_detail["position_size"]
            if "strategy" in self.recommendation_detail:
                result["strategy"] = self.recommendation_detail["strategy"]
            if "holding_period" in self.recommendation_detail:
                result["holding_period"] = self.recommendation_detail["holding_period"]

        if self.risk_assessment:
            if "suitable_investor" in self.risk_assessment:
                result["suitable_for"] = [self.risk_assessment["suitable_investor"]]

        if self.analysis:
            # Extract analysis arrays for frontend display
            if "risks" in self.analysis:
                result["risk_factors"] = self.analysis["risks"] if isinstance(self.analysis["risks"], list) else [self.analysis["risks"]]

            # Create structured analysis sections
            result["fundamental_analysis"] = [self.analysis.get("fundamental", "")] if self.analysis.get("fundamental") else []
            result["technical_signals"] = [self.analysis.get("technical", "")] if self.analysis.get("technical") else []
            result["institutional_behavior"] = [self.analysis.get("institutional", "")] if self.analysis.get("institutional") else []

        return result


class RecommendationAgent:
    """
    Recommendation Agent that analyzes market data and generates
    investment recommendations without executing actual trades.
    """

    def __init__(self, market: str, model_override: Optional[str] = None):
        """
        Initialize the recommendation agent.

        Args:
            market: "us" for US market or "cn" for Chinese A-share market
            model_override: Optional model to use instead of default
        """
        if market not in ["us", "cn"]:
            raise ValueError(f"Invalid market: {market}. Must be 'us' or 'cn'.")

        self.market = market
        self.model = model_override or DEFAULT_MODEL
        self.client = AsyncOpenAI(
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_API_BASE,
        )

    async def fetch_market_data(self) -> dict:
        """Fetch relevant market data from Golden Agent API"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get bulk data
            response = await client.get(f"{GOLDEN_AGENT_API}/api/bulk")
            response.raise_for_status()
            data = response.json()

            if self.market == "us":
                return {
                    "congress_trades": data.get("congress", {}).get("trades", [])[:50],
                    "insider_trades": data.get("insiders", {}).get("trades", [])[:50],
                    "insider_summary": data.get("insiders", {}).get("summary", [])[:20],
                }
            else:
                return {
                    "indices": data.get("stocks", {}).get("indices", []),
                    "sectors": data.get("stocks", {}).get("sectors", [])[:30],
                    "hot_stocks": data.get("stocks", {}).get("hot", [])[:50],
                    "gold": data.get("gold", {}).get("prices"),
                }

    def _build_system_prompt(self) -> str:
        """Build the system prompt for the LLM"""
        return get_prompt(self.market)

    def _build_user_prompt(self, market_data: dict) -> str:
        """Build the user prompt with market data"""
        if self.market == "us":
            congress_trades = market_data.get("congress_trades", [])
            insider_trades = market_data.get("insider_trades", [])
            insider_summary = market_data.get("insider_summary", [])

            # Aggregate congress trades by ticker
            congress_by_ticker = {}
            for t in congress_trades:
                ticker = t.get("ticker", "").upper()
                if not ticker:
                    continue
                if ticker not in congress_by_ticker:
                    congress_by_ticker[ticker] = {"count": 0, "buys": 0, "sells": 0}
                congress_by_ticker[ticker]["count"] += 1
                if t.get("transaction_type") == "purchase":
                    congress_by_ticker[ticker]["buys"] += 1
                else:
                    congress_by_ticker[ticker]["sells"] += 1

            # Aggregate insider trades by ticker
            insider_by_ticker = {}
            for t in insider_trades:
                ticker = t.get("ticker", "").upper()
                if not ticker:
                    continue
                if ticker not in insider_by_ticker:
                    insider_by_ticker[ticker] = {"count": 0, "value": 0}
                insider_by_ticker[ticker]["count"] += 1
                insider_by_ticker[ticker]["value"] += t.get("total_value") or 0

            return f"""
请分析以下美股市场数据并给出投资建议。

## 国会议员交易记录 (最近50条)
按股票代码汇总:
{json.dumps(congress_by_ticker, indent=2, ensure_ascii=False)}

## 内幕交易记录 (最近50条)
按股票代码汇总:
{json.dumps(insider_by_ticker, indent=2, ensure_ascii=False)}

## 内幕交易汇总 (按交易金额排序)
{json.dumps(insider_summary[:10], indent=2, ensure_ascii=False)}

---

【输出格式要求 - 必须严格遵守】

你必须输出一个 JSON 数组，包含 1-3 个推荐，每个推荐必须包含以下完整字段：

```json
[
  {{
    "ticker": "AAPL",
    "company_name": "Apple Inc.",
    "action": "buy",
    "confidence": 0.78,
    "confidence_breakdown": {{
      "fundamental_score": 0.85,
      "technical_score": 0.70,
      "institutional_score": 0.80,
      "sentiment_score": 0.65
    }},
    "analysis": {{
      "fundamental": "P/E 28.5，略高于行业均值25.2，但ROE达45%，盈利能力优秀...",
      "technical": "股价站稳MA20上方，MA5金叉MA20。RSI 58处于健康区间...",
      "institutional": "国会交易：众议员买入$15,000-$50,000，近30天净买入3笔...",
      "risks": ["1. 利率维持高位可能压制科技股估值", "2. 中国市场竞争加剧"]
    }},
    "recommendation": {{
      "strategy": "逢低分批布局",
      "entry_zone": ["$175.00", "$180.00"],
      "price_target": 195.00,
      "stop_loss": 168.00,
      "holding_period": "3-6个月",
      "position_size": "建议仓位5%-10%"
    }},
    "risk_assessment": {{
      "risk_level": "中",
      "risk_reason": "基本面稳健但估值偏高",
      "suitable_investor": "稳健型及以上投资者",
      "max_position": "10%"
    }},
    "disclaimer": "本分析仅供参考，不构成投资建议。投资有风险，入市需谨慎。"
  }}
]
```

【最终提醒】你的回复必须是纯 JSON 数组格式，直接以 "[" 开始，以 "]" 结束！"""
        else:
            # CN market
            indices = market_data.get("indices", [])
            sectors = market_data.get("sectors", [])
            hot_stocks = market_data.get("hot_stocks", [])
            gold = market_data.get("gold")

            return f"""
请分析以下A股市场数据并给出投资建议。

## 主要指数
{json.dumps(indices, indent=2, ensure_ascii=False)}

## 行业板块 (涨幅前30)
{json.dumps(sectors[:15], indent=2, ensure_ascii=False)}

## 热门个股 (成交量前50)
{json.dumps(hot_stocks[:20], indent=2, ensure_ascii=False)}

## 黄金价格
{json.dumps(gold, indent=2, ensure_ascii=False) if gold else "暂无数据"}

---

【输出格式要求 - 必须严格遵守】

你必须输出一个 JSON 数组，包含 1-3 个推荐，每个推荐必须包含以下完整字段：

```json
[
  {{
    "ticker": "600519",
    "company_name": "贵州茅台",
    "action": "buy",
    "confidence": 0.75,
    "confidence_breakdown": {{
      "sector_score": 0.80,
      "technical_score": 0.70,
      "fund_flow_score": 0.75,
      "sentiment_score": 0.65
    }},
    "analysis": {{
      "sector_rotation": "白酒板块资金持续流入，龙头股表现强势...",
      "technical": "股价站稳MA20上方，量价配合良好，RSI 55处于健康区间...",
      "fund_flow": "北向资金连续3日净流入，主力资金净买入...",
      "risks": ["1. 消费复苏不及预期", "2. 估值处于历史高位"]
    }},
    "recommendation": {{
      "strategy": "逢低分批布局",
      "entry_zone": ["¥1650.00", "¥1680.00"],
      "price_target": 1850.00,
      "stop_loss": 1580.00,
      "holding_period": "3-6个月",
      "position_size": "建议仓位5%-10%"
    }},
    "risk_assessment": {{
      "risk_level": "中",
      "risk_reason": "基本面稳健但估值偏高",
      "suitable_investor": "稳健型及以上投资者",
      "max_position": "10%"
    }},
    "disclaimer": "本分析仅供参考，不构成投资建议。投资有风险，入市需谨慎。"
  }}
]
```

【最终提醒】你的回复必须是纯 JSON 数组格式，直接以 "[" 开始，以 "]" 结束！"""

    async def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """Call the LLM with the given prompts"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=4000,  # Increased for enhanced output format
            )
            message = response.choices[0].message
            # GLM-5 returns content in reasoning_content field
            content = message.content or getattr(message, 'reasoning_content', None) or ""
            return content
        except Exception as e:
            print(f"[LLM Error] {e}")
            raise

    def _parse_recommendations(self, llm_output: str) -> list[Recommendation]:
        """Parse LLM output to extract recommendations

        Supports both US stock format (AAPL) and A-share format (600519)
        """
        recommendations = []

        # First, try to find JSON array format [...]
        json_array_match = re.search(r'\[\s*\{[\s\S]*\}\s*\]', llm_output)
        if json_array_match:
            try:
                data_list = json.loads(json_array_match.group())
                if isinstance(data_list, list):
                    for data in data_list[:MAX_RECOMMENDATIONS]:
                        action = str(data.get("action", "")).lower()
                        if action not in ["buy", "sell", "hold"]:
                            continue

                        ticker = data.get("ticker", data.get("symbol", data.get("stock", "")))
                        if not ticker:
                            continue

                        rec = self._create_recommendation(data, ticker, action)
                        if rec:
                            recommendations.append(rec)
            except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
                print(f"[Parser] JSON array parse error: {e}")

        # If no array found, try individual JSON objects
        if not recommendations:
            # Pattern to match JSON objects with action field
            patterns = [
                # Standard JSON object with action field
                r'\{[^{}]*"action"\s*:\s*"(buy|sell|hold)"[^{}]*\}',
                # JSON with any order of fields
                r'\{(?:[^{}]|"(?:action|ticker|confidence|reasoning|price_target|stop_loss)"\s*:\s*(?:"[^"]*"|[\d.]+|null|true|false))+\}',
            ]

            for pattern in patterns:
                matches = re.findall(pattern, llm_output, re.DOTALL | re.IGNORECASE)
                for match in matches:
                    # Ensure we have a complete JSON object
                    json_str = match if isinstance(match, str) and match.startswith('{') and match.endswith('}') else None
                    if not json_str:
                        continue

                    try:
                        data = json.loads(json_str)
                        action = str(data.get("action", "")).lower()
                        if action not in ["buy", "sell", "hold"]:
                            continue

                        ticker = data.get("ticker", data.get("symbol", data.get("stock", "")))
                        if not ticker:
                            continue

                        rec = self._create_recommendation(data, ticker, action)
                        if rec:
                            recommendations.append(rec)

                        if len(recommendations) >= MAX_RECOMMENDATIONS:
                            break

                    except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
                        print(f"[Parser] JSON object parse error: {e}")
                        continue

                if recommendations:
                    break

        # If no structured recommendations found, try to extract from text
        if not recommendations:
            recommendations = self._extract_from_text(llm_output)

        # Final fallback
        if not recommendations:
            recommendations.append(Recommendation(
                market=self.market,
                ticker="N/A",
                action="hold",
                confidence=0.5,
                reasoning=f"AI 分析完成，但未能提取结构化推荐。请查看原始分析内容。",
            ))

        return recommendations

    def _create_recommendation(self, data: dict, ticker: str, action: str) -> Optional[Recommendation]:
        """Create a Recommendation object from parsed data with enhanced fields

        If LLM doesn't provide enhanced fields, generate intelligent defaults
        based on action, confidence, and reasoning.
        """
        try:
            # Normalize ticker format based on market
            ticker_str = str(ticker).strip()
            if self.market == "cn":
                # A-share: ensure 6-digit format, uppercase for consistency
                ticker_str = ticker_str.upper()
                # Validate it's a valid A-share code pattern
                if not re.match(r'^\d{6}$', ticker_str):
                    # Try to extract 6 digits if embedded in text
                    match = re.search(r'(\d{6})', ticker_str)
                    if match:
                        ticker_str = match.group(1)
            else:
                # US stock: uppercase letters
                ticker_str = ticker_str.upper()

            confidence = float(data.get("confidence", 0.5))

            # Extract or generate company name
            company_name = data.get("company_name")
            if not company_name:
                # Use stock name mappings
                if self.market == "us":
                    us_names = {
                        "AAPL": "Apple Inc.", "MSFT": "Microsoft Corp.", "GOOGL": "Alphabet Inc.",
                        "AMZN": "Amazon.com Inc.", "NVDA": "NVIDIA Corp.", "META": "Meta Platforms Inc.",
                        "TSLA": "Tesla Inc.", "JPM": "JPMorgan Chase", "V": "Visa Inc.",
                        "BAC": "Bank of America", "CSCO": "Cisco Systems", "ABBV": "AbbVie Inc."
                    }
                    company_name = us_names.get(ticker_str, ticker_str)
                else:
                    cn_names = {
                        "600519": "贵州茅台", "000858": "五粮液", "601318": "中国平安",
                        "600036": "招商银行", "300308": "中际旭创", "300017": "网宿科技",
                        "002131": "利欧股份", "300251": "光线传媒", "601899": "紫金矿业"
                    }
                    company_name = cn_names.get(ticker_str, f"A股{ticker_str}")

            # Extract or generate confidence breakdown
            confidence_breakdown = data.get("confidence_breakdown")
            if not confidence_breakdown:
                # Generate intelligent defaults based on action and confidence
                base_score = confidence
                variance = 0.1  # Slight variance between scores
                confidence_breakdown = {
                    "fundamental_score": round(base_score + variance, 2),
                    "technical_score": round(base_score - variance/2, 2),
                    "institutional_score": round(base_score + variance/2, 2),
                    "sentiment_score": round(base_score - variance, 2)
                }

            # Extract reasoning
            reasoning = data.get("reasoning", data.get("reason", data.get("analysis", "基于多维度综合分析")))

            # Extract or generate analysis
            analysis = data.get("analysis")
            if not analysis:
                # Generate analysis sections from reasoning or defaults
                analysis = {
                    "fundamental": f"基于财务数据和市场地位的综合评估，{company_name}基本面表现{'优秀' if confidence > 0.7 else '良好' if confidence > 0.5 else '一般'}。",
                    "technical": f"技术面显示{'上升趋势' if action == 'buy' else '下降趋势' if action == 'sell' else '震荡整理'}，建议关注关键支撑阻力位。",
                    "institutional": reasoning[:200] if reasoning else "机构行为数据正在分析中...",
                    "risks": [
                        "1. 市场波动风险：短期价格可能受市场情绪影响",
                        "2. 行业政策风险：需关注相关政策变化",
                        "3. 流动性风险：极端行情下可能面临流动性问题"
                    ]
                }

            # Extract price targets
            price_target = data.get("price_target")
            stop_loss = data.get("stop_loss")

            # Extract or generate recommendation detail
            recommendation_detail = data.get("recommendation")
            if not recommendation_detail:
                strategy_map = {
                    "buy": "逢低分批布局",
                    "sell": "建议止盈减仓",
                    "hold": "持有观望"
                }
                recommendation_detail = {
                    "strategy": strategy_map.get(action, "观望"),
                    "entry_zone": ["参考当前价位", "回调时可考虑"] if action == "buy" else ["-"],
                    "price_target": price_target,
                    "stop_loss": stop_loss,
                    "holding_period": "3-6个月" if action == "buy" else "-",
                    "position_size": "建议仓位5%-10%" if confidence > 0.7 else "建议仓位3%-5%"
                }
            else:
                # Extract price targets from recommendation_detail if not at top level
                if not price_target and "price_target" in recommendation_detail:
                    price_target = recommendation_detail["price_target"]
                if not stop_loss and "stop_loss" in recommendation_detail:
                    stop_loss = recommendation_detail["stop_loss"]

            # Generate default price_target for CN stocks if not provided
            # For A-shares, estimate target price based on typical +8% to +15% from stop_loss
            if not price_target and stop_loss and self.market == "cn" and action == "buy":
                # Typical risk-reward ratio: stop_loss at -6%, target at +10%
                price_target = round(stop_loss * 1.15, 2)  # ~15% above stop_loss
            elif not price_target and stop_loss and self.market == "cn" and action == "sell":
                price_target = round(stop_loss * 0.95, 2)  # ~5% below stop_loss for sell

            # Extract or generate risk assessment
            risk_assessment = data.get("risk_assessment")
            if not risk_assessment:
                risk_level = "low" if confidence >= 0.6 else "medium" if confidence >= 0.4 else "high"
                risk_assessment = {
                    "risk_level": "低" if risk_level == "low" else "中" if risk_level == "medium" else "高",
                    "risk_reason": f"置信度{'较高' if confidence > 0.7 else '中等' if confidence > 0.5 else '较低'}，建议{'稳健型及以上' if confidence > 0.6 else '平衡型及以上' if confidence > 0.4 else '激进型'}投资者关注",
                    "suitable_investor": "稳健型及以上投资者" if confidence > 0.6 else "平衡型及以上投资者",
                    "max_position": "10%" if confidence > 0.7 else "5%"
                }

            disclaimer = data.get("disclaimer", "本分析仅供参考，不构成投资建议。投资有风险，入市需谨慎。过往表现不代表未来收益。")

            return Recommendation(
                market=self.market,
                ticker=ticker_str,
                action=action,
                confidence=confidence,
                reasoning=reasoning,
                price_target=price_target,
                stop_loss=stop_loss,
                company_name=company_name,
                confidence_breakdown=confidence_breakdown,
                analysis=analysis,
                recommendation_detail=recommendation_detail,
                risk_assessment=risk_assessment,
                disclaimer=disclaimer,
            )
        except (ValueError, TypeError) as e:
            print(f"[Parser] Create recommendation error: {e}")
            return None

    def _extract_from_text(self, llm_output: str) -> list[Recommendation]:
        """Extract recommendations from unstructured text

        Supports both US stock format (AAPL) and A-share format:
        - Kweichow Moutai (600519)
        - Buy: 600519
        """
        recommendations = []
        import re

        # Determine ticker pattern based on market
        if self.market == "cn":
            # A-share patterns (6-digit codes)
            # Format 1: "买入：贵州茅台(600519)" or "买入：贵州茅台 (600519)"
            # Format 2: "买入：600519" or "强烈买入：000001"
            # Format 3: "贵州茅台(600519)" with context
            buy_patterns = [
                # 中文格式：买入：贵州茅台(600519) 或 买入：贵州茅台 （600519）
                r'(?:强烈)?买入(?:信号|建议)?[：:\s]+[^\d\(]*[\(（]?\s*(\d{6})\s*[\)）]?',
                # 简单格式：买入：600519
                r'(?:强烈)?买入(?:信号|建议)?[：:\s]+(\d{6})',
                # 股票名称(代码)格式：贵州茅台(600519) 在买入上下文中
                r'[^\d]买入[^\d]*?(\d{6})',
                # Markdown 格式
                r'\*\*(?:强烈)?买入\*\*[：:\s]*(\d{6})',
            ]

            sell_patterns = [
                r'(?:强烈)?卖出(?:信号|建议)?[：:\s]+[^\d\(]*[\(（]?\s*(\d{6})\s*[\)）]?',
                r'(?:强烈)?卖出(?:信号|建议)?[：:\s]+(\d{6})',
                r'[^\d]卖出[^\d]*?(\d{6})',
                r'\*\*(?:强烈)?卖出\*\*[：:\s]*(\d{6})',
            ]
        else:
            # US stock patterns (1-5 uppercase letters)
            buy_patterns = [
                r'(?:强烈)?买入(?:信号)?[：:]\s*\*?\*?([A-Z]{1,5})\*?\*?',
                r'\*\*强烈买入\*\*[：:]\s*([A-Z]{1,5})',
                r'\|\s*([A-Z]{1,5})\s*\|[^|]*\|[^|]*买入[^|]*\|',
                r'([A-Z]{1,5})\s*\(.*?买入.*?\)',
                r'综合判断[：:]\s*\*\*强烈买入\*\*[）\)]?\s*([A-Z]{1,5})',
            ]

            sell_patterns = [
                r'(?:强烈)?卖出(?:信号)?[：:]\s*\*?\*?([A-Z]{1,5})\*?\*?',
                r'\*\*强烈卖出\*\*[：:]\s*([A-Z]{1,5})',
                r'\|\s*([A-Z]{1,5})\s*\|[^|]*\|[^|]*卖出[^|]*\|',
                r'([A-Z]{1,5})\s*\(.*?卖出.*?\)',
            ]

        # Try buy patterns
        for pattern in buy_patterns:
            matches = re.findall(pattern, llm_output, re.IGNORECASE)
            for ticker in matches[:2]:  # 最多取2个
                if ticker and ticker != 'N/A':
                    ticker = str(ticker).upper()
                    recommendations.append(Recommendation(
                        market=self.market,
                        ticker=ticker,
                        action="buy",
                        confidence=0.75,
                        reasoning=f"从 AI 分析中提取的买入信号：{ticker}",
                    ))
            if recommendations:
                break

        # Try sell patterns if no buy signals found
        if not recommendations:
            for pattern in sell_patterns:
                matches = re.findall(pattern, llm_output, re.IGNORECASE)
                for ticker in matches[:2]:
                    if ticker and ticker != 'N/A':
                        ticker = str(ticker).upper()
                        recommendations.append(Recommendation(
                            market=self.market,
                            ticker=ticker,
                            action="sell",
                            confidence=0.75,
                            reasoning=f"从 AI 分析中提取的卖出信号：{ticker}",
                        ))
                if recommendations:
                    break

        return recommendations

    async def analyze(self) -> list[Recommendation]:
        """
        Run the analysis and return recommendations.

        This is the main entry point for the agent.
        """
        print(f"[Agent] Starting analysis for {self.market.upper()} market...")

        # Fetch market data
        market_data = await self.fetch_market_data()
        print(f"[Agent] Fetched market data for {self.market}")

        # Build prompts
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(market_data)

        # Call LLM
        llm_output = await self._call_llm(system_prompt, user_prompt)
        print(f"[Agent] Received LLM response ({len(llm_output)} chars)")
        print(f"[Agent] LLM output preview: {llm_output[:500]}...")

        # Parse recommendations
        recommendations = self._parse_recommendations(llm_output)
        print(f"[Agent] Generated {len(recommendations)} recommendations")

        return recommendations

    async def run_session(self, date: Optional[str] = None) -> list[Recommendation]:
        """
        Run a complete analysis session.

        Args:
            date: Optional date string for historical analysis
        """
        # In a full implementation, this would use MCP tools
        # For now, we just call analyze()
        return await self.analyze()
