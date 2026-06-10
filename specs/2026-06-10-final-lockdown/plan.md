# Phase 6 Implementation Plan: The Final Lockdown

## Task Group 1 — End-to-End Encryption Review
1. **TLS Verification**:
   - Confirm HTTPS is enforced in production (no plain HTTP fallback).
   - Verify Clerk and Convex endpoints use TLS 1.2+ only.
2. **WebRTC Encryption Check**:
   - Inspect `chrome://webrtc-internals` logs: confirm `DTLS` and `SRTP` are active on all peer connections.
   - Disable any non-encrypted codec fallback paths in the SDP negotiation.
3. **Clerk Token Storage Review**:
   - Audit client-side token storage — migrate from `localStorage` to Electron `safeStorage` if currently using localStorage.
   - Confirm tokens are never logged to console or sent to third-party endpoints.
4. **Dependency Audit**:
   - Run `npm audit` on both packages. Fix critical/high issues. Record results in audit log.

## Task Group 2 — General Security Audit
1. **Auth Enforcement Pass**:
   - Grep all Convex mutation/query files for `ctx.auth` usage. Every endpoint must check the caller is authenticated.
   - Review authorization logic: server membership checks, channel access, DM participant checks.
2. **Admin Authorization Scoping**:
   - Verify `members:kick`, `members:updateRole`, `members:transferOwnership` correctly scope to owner/admin roles.
   - Verify message deletion respects role-based permissions.
3. **Input Validation**:
   - Add server-side length/sanitization guards on message content, server names, channel names, and usernames.
   - Reject oversized payloads (>10KB messages, >5MB uploads) before they reach the database.
4. **File Upload Hardening**:
   - Validate MIME types server-side for all image uploads.
   - Ensure uploaded files are served with `Content-Disposition: attachment` and no-sniff headers.
5. **`npm audit` Remediation**: Apply all necessary package updates or patches to resolve reported vulnerabilities.

## Task Group 3 — Staging Environment & Testing
1. **Staging Setup**:
   - Create a staging Convex project (`baatcheet-staging`) and Clerk application.
   - Configure staging environment variables in a `.env.staging` file.
   - Deploy the Electron app in staging mode pointing to staging Convex + Clerk.
2. **Smoke Test Suite**:
   - Write automated smoke tests (Cypress or Playwright) covering: login, send channel message, send DM, create server, friend request, voice channel join/leave.
   - Tests should run against the staging environment.
3. **Regression Run**:
   - Manually run through Phase 1–5 validation checklists (from each phase's `validation.md`).
   - Fix any regressions found.
4. **Cross-Platform Test**:
   - Run the full smoke test on at least one secondary OS (macOS or Linux).

## Task Group 4 — Bug Squashing
1. **Bug Triage**:
   - Review all open GitHub Issues. Label as `blocker`, `high`, `medium`, `low`.
   - Fix all `blocker` and `high` priority bugs.
2. **Stability Soak Test**:
   - Run 30-minute soak test with 4–6 simulated users: continuous messaging, voice calls, file uploads.
   - Monitor memory usage (Heap Snapshot), CPU, and network.
   - No crashes, no disconnections, no memory growth trend.
3. **Final Polish**:
   - Address any visual glitches, UI alignment issues, or minor UX paper cuts discovered during testing.
   - Ensure ESLint passes with zero warnings on both packages.
