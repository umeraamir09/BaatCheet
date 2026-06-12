# BaatCheet — Agent Guide

## Monorepo

- **Workspaces**: `apps/desktop` (Electron + React) and `apps/server` (Fastify + Mediasoup).
- **Package manager**: Bun. Use `bun install`, `bun run <script>`, `bun run --filter <package> <script>`.
- **No test infrastructure exists** in this repo. Do not look for test commands.

## Commands (run from root)

| Command | What it does |
|---|---|
| `bun run dev` | Runs both desktop & server concurrently |
| `bun run dev:desktop` | Desktop only — compiles Electron TS, then Vite + wait-on + Electron |
| `bun run dev:server` | Server only — `tsx watch apps/server/src/index.ts` |
| `bun run build` | Builds both packages for production |
| `bun run lint` | Lints desktop only (ESLint, no lint config for server) |
| `cd apps/desktop && bun run build` | Builds + packages Windows NSIS installer via electron-builder |

## Architecture

- **Desktop** (`apps/desktop`): React 19 / Vite 8 / Tailwind 4 / Zustand inside Electron.
  - Vite root = `src/renderer/` (non-standard). Output goes to `dist/`.
  - Electron main process in `src/main/` compiles to `dist-electron/` via `tsconfig.electron.json`.
  - Three Electron TS configs: `tsconfig.electron.json` (main), `tsconfig.preload.json` (preload), and `tsconfig.app.json` (renderer + convex, uses `noEmit: true` via Vite).
  - `predev`/`prebuild` scripts: run `fix-electron.cjs` + compile electron TS configs first.
  - Uses `HashRouter` (not BrowserRouter).
  - CSP is set both in `src/renderer/index.html` (permissive for dev) and enforced in `src/main/main.ts` (tighter in prod).
  - Convex functions live in `convex/` (schema, queries, mutations, auth).
  - Auth via Clerk → Convex Auth (`@convex-dev/auth`). JWT verified in server via JWKS.

- **Server** (`apps/server`): Fastify 5 + Socket.IO 4 + Mediasoup 3 (WebRTC SFU).
  - Entry: `src/index.ts` — serves healthcheck, RTP capabilities, Socket.IO signaling.
  - Voice channels create per-channel Mediasoup routers on demand (`src/voiceManager.ts`).
  - Dev mode: `tsx watch` (no build step needed).

- **Database**: Convex (cloud-hosted serverless). Schema in `convex/schema.ts`.

## Config quirks

- Desktop `tsconfig.app.json` enables `verbatimModuleSyntax` and `erasableSyntaxOnly` — use `import type` for type-only imports and do not use `enum`/`namespace`.
- Mediasoup builds native code at install time. If install fails, check `trustedDependencies` in root `package.json`.
- Environment: copy `.env.example` → `.env`. Per-app `.env.*` files also exist in each workspace.
- Electron uses `baatcheet://` custom protocol for OAuth deep-link auth.
- The server listens on `0.0.0.0` by default (`SERVER_PORT=3001`, `CORS_ORIGIN=http://localhost:5173`).
- Mediasoup RTC ports: `40000-49999`. VAD is client-side (Web Audio API AnalyserNode).

## Style & conventions

- `type: "module"` throughout (ESM).
- Strict TypeScript everywhere. `noUnusedLocals` and `noUnusedParameters` are errors in renderer configs.
- Tailwind CSS 4 with `@tailwindcss/postcss`.
- Dark theme via CSS variables (`--color-bg-primary`, `--color-text-primary`, etc.).
