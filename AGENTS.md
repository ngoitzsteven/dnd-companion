# Repository Guidelines

## Project Structure & Module Organization
- Next.js App Router lives in `app`, with feature route groups in `app/(auth)`, `app/(dashboard)`, and `app/(marketing)` and API handlers under `app/api`.
- Shared React components sit in `components`, split by feature folders and `components/ui` for reusable primitives.
- Data helpers, Supabase clients, and utility logic belong in `lib/*.ts`, with generated database types in `types/database.ts`.
- Static assets go in `public`; database schema changes must be reflected in `supabase/schema.sql` so the backend stays versioned.

## Build, Test, and Development Commands
- `npm install` syncs dependencies; rerun whenever `package.json` changes.
- `npm run dev` starts the local dev server at http://localhost:3000 (ensure Supabase env vars exist in `.env.local`).
- `npm run build` creates the production bundle; run before releases to catch type or lint regressions.
- `npm run start` serves the built app for final smoke checks.
- `npm run lint` runs ESLint with `next/core-web-vitals`; resolve warnings before committing.

## Coding Style & Naming Conventions
- Use TypeScript everywhere; React components in `.tsx`, utilities in `.ts`.
- Keep two-space indentation and the formatting produced by the default Next.js tooling; do not hand-format around ESLint rules.
- Components/hooks use `PascalCase`/`camelCase`; route folders and files inside `app` stay lowercase with hyphens.
- Compose styling with Tailwind classes defined in `app/globals.css`; extract repeated patterns into `components/ui` variants.

## Testing Guidelines
- Automated testing is not yet configured; add Jest + React Testing Library coverage alongside files (e.g. `components/foo.test.tsx`) when introducing complex logic and document how to run it.
- Manually verify critical auth and dashboard flows against `npm run dev` and a seeded Supabase project before submitting.
- After editing Supabase schema, regenerate types via `supabase gen types typescript --linked --project-ref <project-id>` and update `types/database.ts`.

## Commit & Pull Request Guidelines
- Write imperative commit messages; include ticket prefixes such as `COMP-03` when relevant (see `git log`).
- PRs should summarize the change, list manual/automated checks, and attach UI screenshots or schema diffs when user-facing.
- Call out any required env vars, Supabase migrations, or follow-up tasks in the PR description.
