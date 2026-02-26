# Repository Guidelines

## Project Structure & Module Organization
This repository is a multi-service workspace:
- `server/`: Node.js + TypeScript API, scheduled sync jobs, Prisma schema (`server/prisma/schema.prisma`).
- `frontend_vite/`: main React + Vite client app (`src/pages`, `src/components`, `src/layouts`).
- `admin/`: separate React + Vite admin console.
- `backend/`: Python FastAPI service (`backend/app`) for data-related APIs.
- `ai-trader-service/`: Python AI service used by startup scripts.
- Root utility scripts: `start.bat`, `start-simple.bat`, `deploy.py`, `check_status.py`.

## Build, Test, and Development Commands
Run commands from each module directory:
- `cd server && npm install && npm run dev`: start API in watch mode.
- `cd server && npm run build`: compile TypeScript to `dist/`.
- `cd server && npm run db:push`: sync Prisma schema to database.
- `cd frontend_vite && npm install && npm run dev`: start user frontend.
- `cd frontend_vite && npm run build`: type-check + production build.
- `cd frontend_vite && npm run lint`: run ESLint.
- `cd admin && npm install && npm run dev`: start admin frontend on port `3001`.
- `cd backend && python run.py`: start FastAPI service (port `8000` by default in script).
- `start.bat`: one-click local startup for major services on Windows.

## Coding Style & Naming Conventions
- TypeScript/React: keep strict typing; use `PascalCase` for components, `camelCase` for functions/variables.
- Python: follow PEP 8 (`snake_case` functions/modules, `PascalCase` classes).
- Keep route and service files grouped by domain (`routes/news.ts`, `services/gold_service.py`).
- Use ESLint in `frontend_vite/`; no repo-wide formatter is enforced, so keep diffs small and consistent.

## Testing Guidelines
Automated tests are limited right now. For changes:
- Frontend: at minimum run `npm run lint` and `npm run build` in `frontend_vite/` (and `admin/` when touched).
- Server: run `npm run build` in `server/` and verify `/api/health`.
- Python services: start with `python run.py` and validate affected endpoints manually.
- When adding tests, prefer colocated naming: `*.test.ts(x)` (TS) and `test_*.py` (Python).

## Commit & Pull Request Guidelines
- Follow observed commit style: `feat: ...`, `feat(scope): ...`, `fix: ...`, `chore: ...`.
- Keep commits focused to one change area (e.g., `server`, `frontend_vite`, `admin`).
- PRs should include:
  - concise summary and impacted modules,
  - setup/verification steps run locally,
  - linked issue/task ID,
  - screenshots or short recordings for UI changes.
