# Claude Code Project Guidelines

Please refer to and strictly follow [AGENTS.md](./AGENTS.md) for all operational constraints, branch management rules, QA verification steps, and design system tokens.

### Key Highlights
- **Branch Rule**: NEVER commit/push directly to `main` or `dev`. Branch off `dev` as `feat/mobile-*`, `feat/backend-*`, or `fix/*`, and target `dev` in PRs.
- **Backend Verification**: `cd backend && npm test`
- **Mobile Theme**: Import `THEME` from `src/theme` — no hardcoded colors.
