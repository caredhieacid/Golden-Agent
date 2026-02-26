# Security Policy

## Supported Versions

Only the latest `main` branch is supported for security fixes.

## Reporting a Vulnerability

Please do not open public issues for sensitive vulnerabilities.

Report via private channel and include:

- affected module (`server`, `frontend_vite`, `ai-trader-service`, etc.)
- reproduction steps
- impact assessment
- suggested mitigation (if available)

## Secrets and Configuration

- Never commit `.env` files.
- Rotate any leaked credentials immediately.
- Use `.env.example` as template only.

## Hardening Notes

- Use strong `JWT_SECRET` in production.
- Restrict CORS origin in production.
- Disable unneeded features via flags (`ENABLE_AI`, etc.).
- Keep dependencies patched.
