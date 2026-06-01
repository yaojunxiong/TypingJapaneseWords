# Next Supabase Git Vercel

This project is a minimal Next.js starter prepared for Supabase, Git, and Vercel.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Run `npm run dev`.

## Scripts

- `npm run dev` starts the local Next.js server.
- `npm run build` creates a production build.
- `npm run start` runs the production server after a build.
- `npm run lint` checks the project with ESLint.

## E2E tests (Playwright)

Run these commands inside `next-app/`:

- `npm run test:e2e` runs headless E2E checks.
- `npm run test:e2e:ui` opens Playwright UI mode.

First-time setup:

1. Install dependencies with `npm install`.
2. Install browser binaries with `npx playwright install`.

Notes:

- Tests start the app automatically with `npm run dev -- --port 3000`.
- To verify admin access in E2E, set `E2E_ADMIN_COOKIE` (full Cookie header string from an authenticated admin browser session).
- Without `E2E_ADMIN_COOKIE`, the admin-allowed test is skipped while non-admin denial is still tested.
