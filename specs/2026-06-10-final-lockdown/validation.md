# Phase 6 Validation Plan: The Final Lockdown

## Pre-Merge Checklist

### 1. End-to-End Encryption Review
- [ ] All production API traffic uses TLS 1.2+ (verified via browser DevTools or `curl -vI`).
- [ ] WebRTC peer connections show `DTLS` and `SRTP` as active in `chrome://webrtc-internals`.
- [ ] Clerk session tokens are stored using Electron `safeStorage` (not `localStorage` or plain text).
- [ ] No tokens or encryption keys are printed to `console.log`, `console.warn`, or Electron main-process logs.
- [ ] `npm audit` returns zero critical or high severity vulnerabilities in both `apps/desktop` and `apps/server`.

### 2. Security Audit
- [ ] Every Convex mutation and query has a `ctx.auth` check — verified by grep audit: no function lacks authentication.
- [ ] Unauthenticated API calls return a 401 error (not data) — confirmed by calling a mutation without a valid token.
- [ ] A user cannot read messages from a server/channel they are not a member of.
- [ ] A user cannot send a message to a DM thread they are not part of.
- [ ] A `Member` cannot kick other users or promote themselves to `Admin`.
- [ ] Message content >10KB is rejected with a clear error message.
- [ ] File uploads with disallowed MIME types are rejected server-side.
- [ ] Uploaded files are served with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff` headers.

### 3. Staging Environment
- [ ] A staging Convex project and Clerk app are configured and operational.
- [ ] Automated smoke tests pass on the staging environment:
  - [ ] Login with valid Clerk credentials redirects to home screen.
  - [ ] Sending a text message in a channel renders for other users in real-time.
  - [ ] Sending a DM renders for the recipient in real-time.
  - [ ] Creating a server makes it appear in the sidebar.
  - [ ] Sending and accepting a friend request establishes the friendship.
  - [ ] Joining a voice channel establishes a WebRTC connection.
- [ ] Manual regression: all Phase 1–5 validation items pass (refer to each phase's `validation.md`).
- [ ] Smoke tests pass on at least one secondary OS (macOS or Linux).

### 4. Bug Squashing & Stability
- [ ] All `blocker` and `high` priority GitHub Issues are closed or resolved.
- [ ] 30-minute soak test with 4–6 simulated users completes without:
  - [ ] Any app crash or unhandled exception.
  - [ ] Any WebRTC disconnection that does not auto-reconnect within 2 seconds.
  - [ ] Memory growth exceeding 10MB delta between 5-minute and 30-minute heap snapshots.
- [ ] CPU usage during idle (no active call, no typing) is within 5% of baseline from Phase 5.
- [ ] ESLint passes with zero warnings across both `apps/desktop` and `apps/server`.
- [ ] No new TypeScript compilation errors.

### 5. Integration & Regression
- [ ] Phase 2 text messaging still functions correctly.
- [ ] Phase 3 image uploads and reactions still function correctly.
- [ ] Phase 4 voice channels and DM calls still function correctly.
- [ ] Phase 5 server administration, friend system, settings, and keybindings still function correctly.

### Merge Criteria
All items above must be checked. In particular:
- Zero critical or high `npm audit` vulnerabilities — any unresolved is a blocker.
- Automated smoke tests must pass 100% on staging.
- 30-minute soak test must show no memory leak trend.
- No regressions in Phases 1–5 core functionality.
