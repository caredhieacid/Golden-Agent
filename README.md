# Golden Agent

<p align="center">
  <img src="docs/brand/logo.png" alt="Golden Agent Logo" width="120" />
</p>

<h1 align="center">Golden Agent</h1>
<p align="center"><strong>Real-time Market Intelligence Engine for Modern Investing Products</strong></p>
<p align="center"><strong>面向现代投资产品的实时市场情报引擎</strong></p>

<p align="center">
  <a href="https://github.com/your-org/golden-agent/actions/workflows/ci.yml"><img src="https://github.com/your-org/golden-agent/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/your-org/golden-agent/actions/workflows/secret-scan.yml"><img src="https://github.com/your-org/golden-agent/actions/workflows/secret-scan.yml/badge.svg" alt="Secret Scan" /></a>
  <a href="https://github.com/your-org/golden-agent/blob/main/LICENSE"><img src="https://img.shields.io/github/license/your-org/golden-agent" alt="License" /></a>
  <a href="https://github.com/your-org/golden-agent/stargazers"><img src="https://img.shields.io/github/stars/your-org/golden-agent?style=social" alt="Stars" /></a>
</p>

<p align="center">
  English | <a href="#简体中文">简体中文</a>
</p>

---

## English

### The Pitch

Golden Agent is not another static finance dashboard.

It is an **end-to-end real-time market intelligence stack** that lets teams build products with:

- Multi-source market and event ingestion
- Fast first-screen data hydration + live push updates
- AI-ready insight and recommendation workflows
- User-facing app + admin console in one repository

### Why This Project Wins Attention

| Capability | Golden Agent | Typical OSS Finance Project |
|---|---|---|
| Architecture depth | `Node + TypeScript + React + FastAPI + AI service` | Usually single-layer |
| Real-time UX | `/api/bulk` + `/api/sse` built-in | Mostly polling |
| Market coverage | Gold + CN + global indices + US political/insider events | Usually single market |
| Production controls | Feature flags + modular services | Limited configurability |

### Product Experience

#### Cover

![Golden Agent Cover](docs/screenshots/cover.png)

#### GIF Demos

- User experience demo: `docs/screenshots/demo-user.gif`
- AI insights demo: `docs/screenshots/demo-ai.gif`
- Admin operations demo: `docs/screenshots/demo-admin.gif`

> Replace placeholders with your real captures before public launch.

### Use Cases

- Build a real-time market intelligence dashboard for your own investment workflow
- Prototype an AI-assisted analyst workspace with explainable signals
- Run event-driven monitoring for congress/insider activity and market impact
- Use as a base for fintech hackathons, internal tools, or research products

### Architecture (High-Level)

```text
Data Sources
   -> server (Node.js + Prisma + schedulers)
      -> REST API (/api/*)
      -> SSE stream (/api/sse)
      -> frontend_vite (user app)
      -> admin (ops console)

Optional AI Layer
   -> ai-trader-service (FastAPI)
      -> proxied through /api/ai/*
```

### Monorepo Layout

- `server/` Core API, sync jobs, Prisma schema
- `frontend_vite/` Main user product (React + Vite)
- `admin/` Admin console (React + Vite)
- `backend/` Data-related FastAPI service
- `ai-trader-service/` AI recommendation service
- `OPEN_SOURCE_READINESS.md` Open-source release checklist

### Quick Start

```bash
# 1) API
cd server
npm install
cp .env.example .env
npm run db:push
npm run dev

# 2) Frontend
cd ../frontend_vite
npm install
cp .env.example .env
npm run dev

# 3) Admin
cd ../admin
npm install
npm run dev
```

Optional AI service:

```bash
cd ai-trader-service
pip install -r requirements.txt
python main.py
```

Default ports:

- API: `http://localhost:8000`
- Frontend: `http://localhost:5173`
- Admin: `http://localhost:3001`
- AI Service: `http://localhost:8001`

### Core APIs

- `GET /api/health`
- `GET /api/features`
- `GET /api/bulk`
- `GET /api/sse`
- `GET /api/search?q=...`
- `GET /api/ai/status`
- `GET /api/ai/insights`
- `GET /api/ai/recommendations`

### FAQ

**Q: Is this a trading bot?**  
A: No. It is a research and intelligence platform, not an execution engine.

**Q: Can I disable AI features?**  
A: Yes. Use feature flags in `server/.env` (for example `ENABLE_AI=false`).

**Q: Is it suitable for production?**  
A: It is production-oriented, but you should complete the tasks in `OPEN_SOURCE_READINESS.md` first.

**Q: What data model is used?**  
A: Prisma with the schema in `server/prisma/schema.prisma`.

### Star History

[![Star History Chart](https://api.star-history.com/svg?repos=your-org/golden-agent&type=Date)](https://www.star-history.com/#your-org/golden-agent&Date)

### Roadmap Timeline

- **Phase 1 (Foundation)**: CI, secret scanning, release hygiene
- **Phase 2 (Reliability)**: API smoke tests, Docker one-command startup
- **Phase 3 (Trust)**: OpenAPI docs, stronger validation and observability
- **Phase 4 (Product Power)**: Better explainability, evaluation loops, strategy tooling

### Contributing

Start here:

- `CONTRIBUTING.md`
- `SECURITY.md`
- `OPEN_SOURCE_READINESS.md`

### Security Notes

- Never commit `.env` files
- Rotate leaked credentials immediately
- Use strong production secrets (`JWT_SECRET`, SMTP)
- Restrict CORS origins in production

---

## 简体中文

### 项目定位

Golden Agent 不是一个静态看盘页面集合，而是一套**端到端实时市场情报底座**。

它帮助你在同一仓库内完成：

- 多源行情与事件同步
- 首屏快速聚合 + SSE 实时推送
- AI 信号与推荐工作流
- 用户前台 + 管理后台的产品闭环

### 为什么它更容易吸引关注

| 能力 | Golden Agent | 常见开源金融项目 |
|---|---|---|
| 架构完整度 | `Node + TypeScript + React + FastAPI + AI 服务` | 常见单层能力 |
| 实时体验 | 内置 `/api/bulk` + `/api/sse` | 多为轮询 |
| 市场覆盖 | 黄金 + A股 + 全球指数 + 美股事件 | 常见单市场 |
| 可扩展性 | Feature Flags + 模块化服务 | 可控性较弱 |

### 产品展示

#### 封面图

![Golden Agent 封面](docs/screenshots/cover.png)

#### GIF 演示

- 用户端演示：`docs/screenshots/demo-user.gif`
- AI 信号演示：`docs/screenshots/demo-ai.gif`
- 后台操作演示：`docs/screenshots/demo-admin.gif`

> 发布前请替换为真实截图和录屏。

### 典型使用场景

- 搭建自己的实时市场情报看板
- 快速验证 AI 辅助研究产品原型
- 做国会/内幕交易事件的异动监控
- 作为投研类 Hackathon 或内部工具底座

### 架构概览

```text
数据源
   -> server (Node.js + Prisma + 定时任务)
      -> REST API (/api/*)
      -> SSE 推送 (/api/sse)
      -> frontend_vite (用户前台)
      -> admin (管理后台)

可选 AI 层
   -> ai-trader-service (FastAPI)
      -> 通过 /api/ai/* 对外
```

### 仓库结构

- `server/` 核心 API、同步任务、Prisma schema
- `frontend_vite/` 用户前台（React + Vite）
- `admin/` 管理后台（React + Vite）
- `backend/` 数据相关 FastAPI 服务
- `ai-trader-service/` AI 推荐服务
- `OPEN_SOURCE_READINESS.md` 开源发布清单

### 本地快速启动

```bash
# 1) 后端
cd server
npm install
cp .env.example .env
npm run db:push
npm run dev

# 2) 前端
cd ../frontend_vite
npm install
cp .env.example .env
npm run dev

# 3) 管理后台
cd ../admin
npm install
npm run dev
```

可选 AI 服务：

```bash
cd ai-trader-service
pip install -r requirements.txt
python main.py
```

默认端口：

- API：`http://localhost:8000`
- 前端：`http://localhost:5173`
- 管理后台：`http://localhost:3001`
- AI 服务：`http://localhost:8001`

### 核心接口

- `GET /api/health`
- `GET /api/features`
- `GET /api/bulk`
- `GET /api/sse`
- `GET /api/search?q=...`
- `GET /api/ai/status`
- `GET /api/ai/insights`
- `GET /api/ai/recommendations`

### 常见问题（FAQ）

**问：这是自动交易机器人吗？**  
答：不是。它是投研与情报系统，不直接执行交易。

**问：可以关闭 AI 功能吗？**  
答：可以。在 `server/.env` 通过开关控制（例如 `ENABLE_AI=false`）。

**问：可以直接上生产吗？**  
答：建议先完成 `OPEN_SOURCE_READINESS.md` 中的发布前任务。

**问：数据库模型在哪里？**  
答：`server/prisma/schema.prisma`。

### Star History

[![Star History Chart](https://api.star-history.com/svg?repos=your-org/golden-agent&type=Date)](https://www.star-history.com/#your-org/golden-agent&Date)

### 路线图时间线

- **Phase 1（基础）**：CI、密钥扫描、发布规范
- **Phase 2（可靠性）**：关键接口 smoke tests、Docker 一键启动
- **Phase 3（信任）**：OpenAPI 文档、更强可观测与校验
- **Phase 4（产品力）**：可解释性增强、评估闭环、策略工具化

### 贡献方式

提交前请先阅读：

- `CONTRIBUTING.md`
- `SECURITY.md`
- `OPEN_SOURCE_READINESS.md`

### 安全提示

- 严禁提交 `.env`
- 密钥泄露必须立即轮换
- 生产环境使用强密钥（`JWT_SECRET`、SMTP）
- 生产环境收紧 CORS

---

## Disclaimer | 免责声明

This project is for research and information purposes only. It does not provide investment advice or automated trade execution.

本项目仅用于研究与信息展示，不构成投资建议，也不直接执行自动交易。
