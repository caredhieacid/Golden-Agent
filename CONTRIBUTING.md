# Contributing

Thanks for contributing to Golden Agent.

## Development Setup

1. Server

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

2. Frontend

```bash
cd frontend_vite
npm install
cp .env.example .env
npm run dev
```

3. Optional AI service

```bash
cd ai-trader-service
pip install -r requirements.txt
python main.py
```

## Contribution Rules

- Keep PRs focused on one area (`server`, `frontend_vite`, `admin`, etc.).
- Follow commit style: `feat: ...`, `fix: ...`, `chore: ...`.
- Do not include secrets or private keys.
- For UI changes, attach screenshots.

## Required Checks

- Frontend touched:

```bash
cd frontend_vite
npm run build
```

- Server touched:

```bash
cd server
npm run build
```

## Pull Request Checklist

- Summary of what changed
- Modules affected
- Local verification steps
- Risks / compatibility notes

## Scope and Compliance

This project is for information and research tooling.

- Do not claim guaranteed returns.
- Do not market outputs as direct investment advice.
- Keep risk warnings in user-facing pages.
