# OAuth Browser Flow — Implementation Plan

## Task Group 1 — Register `baatcheet://` Protocol (Main Process)

1. Add `baatcheet` scheme to `protocol.registerSchemesAsPrivileged()` alongside the existing `app` scheme (same privileges: `secure`, `standard`, `corsEnabled`).
2. Implement `app.setAsDefaultProtocolClient('baatcheet')` to register at the OS level.
3. Add a `protocol.handle('baatcheet', ...)` handler that parses the deep-link URL, extracts auth state/token, and forwards it to the renderer via IPC.
4. Handle `open-url` / `second-instance` events (Windows: `requestSingleInstanceLock` + `second-instance`; macOS: `open-url`) so `baatcheet://` redirects wake the existing app window instead of spawning a new instance.

## Task Group 2 — Switch ClerkProvider to Account Portal (Renderer)

1. Replace the `publishableKey`-only `<ClerkProvider>` with one that sets `signInUrl` and `signUpUrl` pointing to the Clerk Account Portal:
   - `signInUrl="https://accounts.umroo.dev/sign-in"`
   - `signUpUrl="https://accounts.umroo.dev/sign-up"`
2. Remove `allowedRedirectOrigins`, `fallbackRedirectUrl`, `signInFallbackRedirectUrl`, `signUpFallbackRedirectUrl` (Account Portal handles its own redirects).
3. Remove the embedded `<SignInPage>` and `<SignUpPage>` route definitions from the router — `RequireAuth` redirects to the Account Portal URL instead.
4. Add the Account Portal URLs to the CSP's `frame-src` and `connect-src` (Account Portal may embed or connect from its domain).

## Task Group 3 — Handle Auth Callback in Renderer

1. Add an IPC listener in the renderer (via `window.electronAPI`) that receives the auth callback payload (`userId`, `token`, or Clerk session state) from the main process.
2. On receiving a valid auth callback, update the Clerk client state or trigger a page reload so `useAuth()` re-evaluates.
3. Show a brief "Signing in..." overlay while the callback is being processed.

## Task Group 4 — Update Build & Installer Config

1. In `electron-builder` config (`package.json`), add:
   ```json
   "protocols": {
     "name": "BaatCheet",
     "schemes": ["baatcheet"]
   }
   ```
2. Verify NSIS installer registers `baatcheet://` in the Windows registry.

## Task Group 5 — Cleanup

1. Remove `SignInPage.tsx` and `SignUpPage.tsx` from the renderer (no longer used in production; can keep for dev-mode reference).
2. Remove `allowedRedirectOrigins` and redirect URL props from ClerkProvider (handled by Account Portal).
3. Remove no-longer-needed Clerk domains (`clerk.umroo.dev`, `*.clerk.accounts.dev`, `challenges.cloudflare.com`) from CSP in both `index.html` and `main.ts` — only the Account Portal domain (`accounts.umroo.dev`) may remain if needed for framing.
4. Remove `webSecurity: false` override if present.
