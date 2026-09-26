# Mabar (MainBareng) — AI Coding Agent Operational Guidelines

You are an autonomous AI engineering agent pairing inside this repository. You MUST strictly adhere to the project conventions and team operational rules described below.

---

## 🚫 1. STRICT GIT & BRANCHING RULES (CRITICAL)

1. **NEVER push directly to `main` or `dev`**:
   - `main` is protected and reserved for evaluated production releases only.
   - `dev` is the integration hub. Direct commits to `dev` are strictly forbidden for team developers and agents.
2. **ALWAYS work in a scoped feature branch**:
   - Always branch off the latest `origin/dev`:
     ```bash
     git checkout dev
     git pull origin dev
     git checkout -b <branch-name>
     ```
   - Standard branch naming convention:
     - `feat/mobile-<feature-name>` for mobile application features
     - `feat/backend-<feature-name>` for backend API & database features
     - `fix/<scope>-<bug-description>` for bugfixes
     - `docs/<description>` for documentation & milestone reports
3. **Target branch for Pull Requests**:
   - Every Pull Request MUST target `dev` as base, NEVER `main`.
   - Use `.github/pull_request_template.md` checklist when authoring PR descriptions.

---

## 🛡️ 2. QUALITY ASSURANCE & VERIFICATION BEFORE COMMITTING

Before authoring any git commit, you MUST execute and pass local verifications:

1. **Backend Verification**:
   - Working directory: `./backend`
   - Run tests: `npm test` (or `npx jest --coverage`). All tests MUST pass.
2. **Mobile App Verification**:
   - Working directory: `./mobile`
   - Syntax validation: `node -c App.js index.js src/theme.js`
   - Never introduce unverified dependencies without checking `mobile/package.json`.
3. **No Secrets / Credential Leaks**:
   - NEVER commit `.env`, `.env.local`, or any service role keys.
   - Update `.env.example` if you introduce new environment variables.

---

## 🎨 3. MOBILE DESIGN SYSTEM CONVENTIONS (LANGUI FUSION)

When implementing React Native / Expo screens or components:
- **NO HARDCODED COLOR CODES**:
  - Always import `THEME` from `src/theme` (or `../theme`).
  - Use semantic color tokens:
    - Primary accent: `THEME.colors.primary` (`#D5FF40` Neon Volt)
    - Dark background: `THEME.colors.background` (`#0A0B0E`)
    - Surface / Cards: `THEME.colors.card`, `THEME.colors.cardElevated`, `THEME.colors.cardGlass`
    - Borders: `THEME.colors.cardBorder`, `THEME.colors.borderGlass`
    - Status: `THEME.colors.success`, `THEME.colors.warning`, `THEME.colors.danger`
- Design aesthetic: **Bento Grid + Glassmorphism** (Langui Fusion), asymmetric corner radius, high contrast dark theme.

---

## 📦 4. COMMIT MESSAGE CONVENTIONS

Follow **Conventional Commits**:
- `feat(<scope>): <short imperative description>`
- `fix(<scope>): <short imperative description>`
- `docs(<scope>): <short imperative description>`
- `ci: <pipeline change>`
- `refactor(<scope>): <refactor description>`

Do NOT bundle unrelated mobile and backend changes into a single mega-commit unless they form a tight API contract change. Keep commits atomic and modular.
