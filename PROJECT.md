# 金策智显 - 全球投资情报平台

## 项目概述

金策智显（GoldPolicy Intel）是一个全球投资情报平台，追踪多个市场的交易信号和资金动向，帮助投资者发现潜在机会。

**涵盖三大板块**：
- 🏛️ **美国国会交易** - 追踪国会议员的股票交易披露（STOCK Act）
- 📈 **A股市场** - 中国 A 股实时行情、板块热度、资金流向
- 🥇 **黄金市场** - 国内外金价对比、套利空间分析

**目标用户**：个人投资者、交易员、金融从业者

---

## 技术栈

| 层级 | 技术选择 | 理由 |
|------|----------|------|
| 后端框架 | **FastAPI** (Python) | 高性能，自动 Swagger 文档 |
| 前端框架 | **Next.js 15** + shadcn/ui | 现代化，SSR/SSG 支持 |
| 数据库 | **SQLite** (开发) / PostgreSQL (生产) | 零依赖启动，生产可切换 |
| ORM | **SQLModel** | Pydantic + SQLAlchemy 结合 |
| A 股数据 | **AKShare** | 免费开源，1000+ 数据接口 |
| 黄金数据 | **AKShare** + GoldAPI.io (备选) | 国内外金价全覆盖 |
| 国会交易 | **众议院索引文件直接解析** + 第三方 API 补充 | 免费可靠 |
| 定时任务 | **APScheduler** | 内嵌在 FastAPI 中，无需外部调度 |
| 部署 | Docker / 直接运行 | 灵活部署 |

---

## 数据源详解

### 美国国会交易

| 来源 | 用途 | 免费额度 |
|------|------|----------|
| [众议院 Financial Disclosures](https://disclosures-clerk.house.gov/public_disc/) | TAB 分隔索引文件 → 直接解析 | 无限制（公开数据） |
| [Financial Modeling Prep API](https://financialmodelingprep.com/) | 结构化国会交易数据 | 250 次/天 |
| [Quiver Quantitative](https://www.quiverquant.com/) | 收益排名、热门股票 | 免费 tier |

### A 股市场

全部通过 **AKShare**（Python 库）获取，无需 API Key：

| 接口 | 说明 |
|------|------|
| `stock_zh_a_spot_em()` | A 股实时行情（东方财富数据源） |
| `stock_zh_index_spot_em()` | 上证/深证/创业板指数 |
| `stock_board_industry_name_em()` | 行业板块列表 |
| `stock_board_industry_cons_em()` | 板块成分股 |
| `stock_zh_a_hist()` | 个股历史 K 线 |
| `stock_individual_info_em()` | 个股基本信息 |

### 黄金市场

| 来源 | 说明 | 免费额度 |
|------|------|----------|
| AKShare `spot_golden_benchmark()` | 上海金基准价 | 无限制 |
| AKShare `futures_foreign_commodity_realtime()` | 国际期货金价 | 无限制 |
| AKShare `currency_boc_safe()` | 中国银行外汇牌价 | 无限制 |
| [GoldAPI.io](https://www.goldapi.io/) | 实时国际金价（备选） | 100 次/月 |

---

## 项目结构

```
golden-agent/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置管理
│   │   ├── database.py          # 数据库连接
│   │   ├── models.py            # SQLModel 数据模型
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── congress.py      # 国会交易 API
│   │   │   ├── stocks.py        # A 股数据 API
│   │   │   ├── gold.py          # 黄金数据 API
│   │   │   └── health.py        # 健康检查
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── congress_service.py
│   │       ├── stock_service.py
│   │       └── gold_service.py
│   ├── requirements.txt
│   └── run.py
├── frontend/                    # Next.js (已有)
│   └── ...
├── data/                        # 数据缓存目录
├── PROJECT.md                   # 本文件
└── DESIGN_BRIEF.md             # 设计需求简报
```

---

## API 接口设计

### 健康检查
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 服务状态 |

### 国会交易
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/congress/trades` | GET | 交易列表（支持 `?days=90&type=purchase&limit=20`） |
| `/api/congress/politicians` | GET | 活跃议员列表 |
| `/api/congress/politicians/{id}` | GET | 议员详情 + 交易记录 |
| `/api/congress/hot-stocks` | GET | 热门股票排行 |

### A 股市场
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/stocks/indices` | GET | 主要指数行情 |
| `/api/stocks/hot` | GET | 涨幅/跌幅/成交额排行榜 |
| `/api/stocks/{code}` | GET | 个股详情 |
| `/api/stocks/sectors` | GET | 板块涨跌排行 |

### 黄金市场
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/gold/prices` | GET | 国内外金价 + 汇率 + 价差 |
| `/api/gold/history` | GET | 金价历史走势 |

---

## 数据库 Schema (SQLModel)

### 核心模型

```python
# 议员
class Politician:
    id, first_name, last_name, full_name
    chamber  # 'house' / 'senate'
    state, party, district
    active: bool

# 国会交易
class CongressTrade:
    politician_id → Politician
    ticker, company_name
    transaction_type  # 'purchase' / 'sale' / 'sale_partial' / 'sale_full'
    amount_min, amount_max
    transaction_date, disclosure_date
    source_url

# 黄金价格快照
class GoldPrice:
    timestamp
    international_usd  # 国际金价 (USD/盎司)
    domestic_cny       # 国内金价 (CNY/克)
    exchange_rate      # USD/CNY 汇率
    spread_pct         # 价差百分比
```

> 注：A 股行情数据为实时查询，不持久化到数据库。只缓存在内存中（TTL 5 分钟）。

---

## 数据缓存策略

| 数据类型 | 缓存方式 | TTL |
|----------|----------|-----|
| A 股实时行情 | 内存缓存 | 5 分钟 |
| A 股板块数据 | 内存缓存 | 10 分钟 |
| 指数行情 | 内存缓存 | 5 分钟 |
| 国会交易 | 数据库 | 每日更新 |
| 黄金价格 | 数据库 + 内存 | 30 分钟 |

---

## 快速启动

```bash
# 1. 安装后端依赖
cd backend
pip install -r requirements.txt

# 2. 启动后端 (默认 http://localhost:8000)
python run.py

# 3. 访问 API 文档
# 浏览器打开 http://localhost:8000/docs

# 4. 启动前端 (另一个终端)
cd frontend
npm run dev
```

---

## 开发路线图

### 第一阶段 - 核心数据 ✅ (当前)
- [x] 后端框架搭建
- [ ] 国会交易数据获取与 API
- [ ] A 股实时行情 API
- [ ] 黄金价格 API
- [ ] 前端数据对接

### 第二阶段 - 增强功能
- [ ] 定时数据同步 (APScheduler)
- [ ] 议员收益回测
- [ ] K 线图表数据接口
- [ ] 北向资金流向

### 第三阶段 - 智能分析 (需要 LLM API)
- [ ] AI Agent 监控面板
- [ ] 智能选股分析
- [ ] 新闻情绪分析
- [ ] 信号推送系统
