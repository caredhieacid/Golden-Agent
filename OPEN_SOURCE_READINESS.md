# Open Source Readiness Plan

This checklist is the baseline before public release.

## Phase 0: Blockers (must pass first)

- [ ] Rotate leaked credentials immediately:
  - `server/.env` (`JWT_SECRET`, `SMTP_USER`, `SMTP_PASS`)
  - any API tokens in local config files
- [ ] Run full-repo secret scan locally and in CI
- [ ] Confirm no `.env` or private keys are tracked
- [ ] Fix visible text-encoding corruption in user-facing pages and APIs

## Phase 1: Security and Governance

- [x] Add CI secret scanning workflow
- [x] Add dependency update automation (Dependabot)
- [ ] Define private security contact in `SECURITY.md`
- [ ] Add release process for emergency security patches

## Phase 2: Reliability and Developer Experience

- [x] Add multi-module CI build checks:
  - `server` build
  - `frontend_vite` lint + build
  - `admin` build
- [ ] Add smoke tests for:
  - `GET /api/health`
  - `GET /api/bulk`
  - `GET /api/features`
- [ ] Add Docker-based quick start (`docker-compose.yml`)
- [ ] Add seed/minimal demo data mode for contributors

## Phase 3: Documentation and Community

- [ ] Expand architecture section in `README.md`:
  - service boundaries
  - data flow (`bulk + SSE + AI service`)
- [ ] Add API contract doc (OpenAPI or endpoint table with response shape)
- [ ] Add maintainer guide: issue triage, release tags, changelog flow
- [ ] Add "good first issue" labels and contribution examples

## Two-Week Execution Plan

### Week 1

1. Security cleanup and secret rotation.
2. Encoding/data cleanup for all AI and market pages.
3. CI stabilization and failing-check policy.

### Week 2

1. Smoke tests + Docker local setup.
2. API docs and architecture diagram.
3. Public beta release checklist and first tagged release.

## Competitive Advantages (for README/website)

1. Full-stack market intelligence pipeline in one repo (`Node + React + FastAPI + AI service`).
2. Real-time delivery model (`/api/bulk` + `/api/sse`) with good first-load and live updates.
3. Multi-market scope (gold, US congress/insider, A-share, global indices) in one product workflow.
4. Feature-flag architecture for controlled open-source deployment.

