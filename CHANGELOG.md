# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added

- AI route restored in frontend and feature-flagged with `VITE_ENABLE_AI`.
- Server feature flags and feature status endpoint:
  - `ENABLE_AI`
  - `ENABLE_CN_MARKET`
  - `ENABLE_GLOBAL_MARKET`
  - `GET /api/features`
- Global search upgrade (`/api/search`):
  - multi-source retrieval (politicians, stocks, insider stocks, news)
  - ranking score and response timing
  - `market=all|cn|us` filter
  - `include_news=true|false` toggle
  - highlight fields and result metadata totals
- Header search switched from local filtering to backend search API with debounce + abort.
- Open-source onboarding files:
  - `README.md`
  - `server/.env.example`
  - `frontend_vite/.env.example`
  - `CONTRIBUTING.md`
  - `SECURITY.md`
  - GitHub issue and PR templates

### Changed

- Frontend routes are now lazy-loaded via `React.lazy` + `Suspense` to reduce initial payload.
- AI recommendation cards now include explainability sections:
  - Evidence Chain
  - Invalidation Conditions

### Notes

- Build currently shows non-blocking warnings about unresolved font assets and large chunk size.
