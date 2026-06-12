# OAuth Browser Flow — Requirements

## Context & Problem

The production Electron app runs on the `file://` protocol, which is incompatible with two services embedded in Clerk's `<SignIn>`/`<SignUp>` components:

| Problem | Root Cause |
|---|---|
| Clerk redirect URL rejected | `file://` is not a valid origin for Clerk's client-side redirect validation |
| Turnstile Error 300030 | Cloudflare Turnstile cannot verify a `file://` domain |
| Clerk API 400 / domain lock | Production publishable key is locked to `umroo.dev`; `app://localhost` is not a subdomain |

The `app://` protocol fixes Turnstile and redirect origins but fails on Clerk's server-side domain validation — the production key only accepts Origin headers matching `umroo.dev` or its subdomains.

## Solution

Route all authentication through Clerk's **Account Portal** (hosted pages on `accounts.umroo.dev`). Auth happens in the system browser on a proper web domain where Turnstile and the production key work. The app registers a `baatcheet://` custom protocol to receive the callback.

## Scope

- Register a `baatcheet://` custom protocol in Electron (main process + OS-level installer)
- Redirect users to Clerk Account Portal for all sign-in/sign-up flows
- Handle the `baatcheet://auth` deep link callback to complete authentication
- Remove the now-unnecessary embedded `<SignIn>`/`<SignUp>` components
- Update CSP to remove Clerk-specific directives (no longer needed in-app)
- Keep existing Convex+Clerk integration (`ConvexProviderWithClerk`) — only the sign-in surface changes
- Dev mode (`http://localhost:5173`) continues using embedded components

## Out of Scope
- Standalone OAuth-only flow (email+password remains available via Account Portal)
- Token refresh/rotation logic (handled by Clerk SDK automatically)
- Server-side auth changes (JWT verification remains unchanged)
- Migration of existing user sessions

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Auth surface | Clerk Account Portal (hosted pages) | Production key works, Turnstile works, zero Clerk SDK changes needed |
| Callback mechanism | `baatcheet://` custom protocol deep link | Standard desktop app pattern (used by Discord, Slack, etc.) |
| Installer registration | electron-builder `protocols` config | Registers `baatcheet://` in the Windows registry on install |
| Dev mode | Keep embedded `<SignIn>` | `localhost:5173` needs no special handling; avoids complexity |
