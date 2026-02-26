# Golden Agent | 金策智能体

[![CI](https://github.com/your-org/golden-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/golden-agent/actions/workflows/ci.yml)
[![Secret Scan](https://github.com/your-org/golden-agent/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/your-org/golden-agent/actions/workflows/secret-scan.yml)

English | [简体中文](#简体中文)

## English

### What Is Golden Agent?

Golden Agent is an open market-intelligence workspace for building real-time investment research products.

It combines:
- Live data ingestion (gold, A-share, global indices, US congress/insider activity)
- Real-time delivery (`/api/bulk` + `/api/sse`)
- AI signal generation and recommendation APIs
- End-user frontend + admin console

### Why It Stands Out

- Full-stack in one repo: `Node.js + TypeScript + React + FastAPI + AI service`
- Real-time UX architecture: fast initial load + SSE streaming updates
- Multi-market coverage in one product workflow
- Feature flags for controlled open-source deployment

### Architecture

```text
Data Sources
   -> server (Node.js + Prisma + Scheduler)
      -> REST (/api/*) + SSE (/api/sse)
      -> frontend_vite (User App)
      -> admin (Admin Console)

Optional AI Layer
   -> ai-trader-service (FastAPI)
      -> server /api/ai/* proxy endpoints
```

### Monorepo Structure

- `server/` Node.js + TypeScript API, sync jobs, Prisma schema
- `frontend_vite/` React + Vite main client
- `admin/` React + Vite admin console
- `backend/` FastAPI data service
- `ai-trader-service/` FastAPI AI recommendation service
- `OPEN_SOURCE_READINESS.md` release checklist before public launch

### Quick Start (Local)

#### 1) Server

```bash
cd server
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Default: `http://localhost:8000`

#### 2) Frontend

```bash
cd frontend_vite
npm install
cp .env.example .env
npm run dev
```

Default: `http://localhost:5173`

#### 3) Admin Console

```bash
cd admin
npm install
npm run dev
```

Default: `http://localhost:3001`

#### 4) Optional AI Service

```bash
cd ai-trader-service
pip install -r requirements.txt
python main.py
```

Default: `http://localhost:8001`

### Core API Endpoints

- `GET /api/health`
- `GET /api/features`
- `GET /api/bulk`
- `GET /api/sse`
- `GET /api/search?q=...`
- `GET /api/ai/status`
- `GET /api/ai/insights`
- `GET /api/ai/recommendations`

### Security Notes

- Never commit `.env` files
- Rotate credentials immediately if leaked
- Use strong `JWT_SECRET` in production
- Restrict CORS origins in production
- Read `SECURITY.md` for vulnerability reporting

### Verification Commands

```bash
cd server && npm run build
cd frontend_vite && npm run lint && npm run build
cd admin && npm run build
```

### Roadmap

- Add smoke tests for critical APIs
- Add Docker-based one-command startup
- Expand API contract docs (OpenAPI)
- Improve strategy evaluation and signal explainability

### Contributing

Please read:
- `CONTRIBUTING.md`
- `SECURITY.md`
- `OPEN_SOURCE_READINESS.md`

---

## 简体中文

### Golden Agent 是什么？

Golden Agent 是一个面向实盘研究场景的开源市场情报工作台，目标是帮助你快速搭建“可实时更新”的投资研究产品。

它整合了：
- 多源行情与事件同步（黄金、A股、全球指数、美国国会/内幕交易）
- 实时数据分发（`/api/bulk` + `/api/sse`）
- AI 信号与推荐接口
- 用户端前台 + 管理后台

### 为什么它有吸引力

- 一仓库全栈闭环：`Node.js + TypeScript + React + FastAPI + AI 服务`
- 实时体验架构：首屏快加载 + SSE 持续推送
- 多市场统一工作流：同一产品中查看与联动分析
- 特性开关可控：更适合开源场景下逐步放量

### 架构概览

```text
数据源
   -> server (Node.js + Prisma + 定时任务)
      -> REST (/api/*) + SSE (/api/sse)
      -> frontend_vite (用户前台)
      -> admin (管理后台)

可选 AI 层
   -> ai-trader-service (FastAPI)
      -> server 的 /api/ai/* 代理接口
```

### 仓库结构

- `server/` Node.js + TypeScript API、同步任务、Prisma
- `frontend_vite/` React + Vite 主前端
- `admin/` React + Vite 管理端
- `backend/` FastAPI 数据服务
- `ai-trader-service/` FastAPI AI 推荐服务
- `OPEN_SOURCE_READINESS.md` 开源前发布清单

### 本地快速启动

#### 1) 启动后端

```bash
cd server
npm install
cp .env.example .env
npm run db:push
npm run dev
```

默认地址：`http://localhost:8000`

#### 2) 启动前端

```bash
cd frontend_vite
npm install
cp .env.example .env
npm run dev
```

默认地址：`http://localhost:5173`

#### 3) 启动管理后台

```bash
cd admin
npm install
npm run dev
```

默认地址：`http://localhost:3001`

#### 4) 可选：启动 AI 服务

```bash
cd ai-trader-service
pip install -r requirements.txt
python main.py
```

默认地址：`http://localhost:8001`

### 核心接口

- `GET /api/health`
- `GET /api/features`
- `GET /api/bulk`
- `GET /api/sse`
- `GET /api/search?q=...`
- `GET /api/ai/status`
- `GET /api/ai/insights`
- `GET /api/ai/recommendations`

### 安全提示

- 严禁提交 `.env` 文件
- 一旦泄露密钥，必须立即轮换
- 生产环境务必使用强 `JWT_SECRET`
- 生产环境请收紧 CORS 域名
- 漏洞披露流程见 `SECURITY.md`

### 本地验收命令

```bash
cd server && npm run build
cd frontend_vite && npm run lint && npm run build
cd admin && npm run build
```

### 路线图

- 增加关键 API 的 smoke tests
- 增加 Docker 一键启动
- 完善 API 契约文档（OpenAPI）
- 增强策略评估与信号可解释性

### 参与贡献

开始前请阅读：
- `CONTRIBUTING.md`
- `SECURITY.md`
- `OPEN_SOURCE_READINESS.md`

## Disclaimer | 免责声明

This project is for research and information purposes only. It does not provide investment advice or automated trading execution.

本项目仅用于信息展示与研究，不构成投资建议，也不直接执行交易。
