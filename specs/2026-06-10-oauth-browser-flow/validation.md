# OAuth Browser Flow — Validation Plan

## Pre-Merge Checklist

### 1. `baatcheet://` Protocol Registration
- [ ] Electron registers `baatcheet` as a privileged scheme before `app.whenReady()` (no runtime errors).
- [ ] `app.setAsDefaultProtocolClient('baatcheet')` succeeds without error.
- [ ] Installing the built NSIS installer registers `baatcheet://` in Windows registry (verify via `reg query HKCR\baatcheet`).
- [ ] Clicking `baatcheet://auth?...` from a browser launches the app (or brings existing window to focus).

### 2. Account Portal Redirection
- [ ] On production build, clicking "Sign In" opens the system browser to `https://accounts.umroo.dev/sign-in` (not an embedded webview).
- [ ] The Account Portal renders the full sign-in page with email/password and all configured OAuth providers (Discord, Google, etc.).
- [ ] On dev build (`http://localhost:5173`), the existing embedded `<SignIn>` component still works.

### 3. Auth Callback
- [ ] After successful sign-in in the browser, Clerk redirects to `baatcheet://auth?...`.
- [ ] The running app window (or newly focused existing window) receives the callback.
- [ ] The renderer processes the callback and `useAuth().isSignedIn` becomes `true`.
- [ ] The user sees the main app UI (no redirect loops, no error toasts).
- [ ] Full round-trip from clicking "Sign In" to seeing the main UI completes in under 5 seconds on a typical connection.

### 4. Session Persistence
- [ ] Closing and re-opening the app does not require re-authentication (Clerk session cookie/token persists).
- [ ] Clerk JWT is still available via `useAuth().getToken()` for Socket.IO auth.

### 5. Edge Cases
- [ ] Closing the browser tab before completing sign-in leaves the app in the "signed out" state (no partial auth state).
- [ ] Rejecting the redirect/callback (e.g., user closes the browser without completing sign-in) — the app remains unsigned-in gracefully.
- [ ] Second instance: clicking `baatcheet://` link while app is already running focuses the existing window and processes the callback (no duplicate window).
- [ ] Sign-out from the app's `UserButton` works and does not redirect to the browser.

### 6. Security
- [ ] The `baatcheet://` callback URL is validated — only Clerk's expected redirect URL pattern is accepted (no arbitrary deep links).
- [ ] Auth state is forwarded to the renderer via `contextBridge` (no direct `baatcheet://` URL access in renderer).
- [ ] CSP does not load Clerk scripts in the app context (Account Portal is in the system browser, not embedded).

### 7. Convex Integration
- [ ] `ConvexProviderWithClerk` still works — `useAuth()` provides a valid token post-callback.
- [ ] Socket.IO auth middleware (`verifyToken`) accepts the same Clerk JWT as before.

## Merge Criteria
All items above must pass. The auth experience must feel seamless — opening the browser and returning should not take more than 5 seconds total. No regression to the dev-mode embedded component flow.
