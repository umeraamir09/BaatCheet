# Phase 6 Requirements: The Final Lockdown

## Context & Objectives
Phases 1–5 delivered a functional, real-time voice-and-text communication desktop app. Phase 6 is the security and stability lockdown before shipping. No new user-facing features. The goal is to audit, harden, and validate every layer of the stack so the app is safe, reliable, and ready for production use by a small group of friends.

## Scope & Features

### 1. End-to-End Encryption Review
- **Message Encryption Audit**: Verify that all text messages (channel and DM) are encrypted at rest in Convex and in transit over TLS.
- **WebRTC Encryption Verification**: Confirm that all voice/video media streams use DTLS/SRTP encryption as mandated by WebRTC protocol, with no plaintext fallback.
- **Key Management Review**: Document how encryption keys are handled (Clerk session tokens, Convex auth tokens, WebRTC DTLS fingerprints) and ensure no keys are logged or exposed client-side.
- **Clerk Session Security**: Confirm Clerk session tokens are stored securely (Electron safeStorage or encrypted cookies, not localStorage) and are rotated appropriately.

### 2. General Security Audit
- **Authentication & Authorization**:
  - Verify that all Convex mutations/queries enforce `ctx.auth` checks — no unauthenticated user can read/write data.
  - Verify server/channel-level authorization: users can only access servers, channels, and DMs they are members of.
  - Verify admin actions (kick, promote, message deletion) are properly scoped.
- **Input Validation**:
  - Audit all user-supplied input fields (messages, usernames, server names) for XSS, injection, and length-abuse vectors.
  - Ensure Socket.IO events validate payloads server-side before processing.
- **File Upload Security**:
  - Confirm file type and size restrictions on image uploads are enforced server-side.
  - Verify uploaded files are served with proper Content-Type headers and no direct execution.
- **Dependency Audit**: Run `npm audit` on both `apps/desktop` and `apps/server`. Resolve any critical/high severity vulnerabilities.

### 3. Staging Environment Testing
- **Staging Deployment**: Stand up a staging environment mirroring production (Convex project, Clerk app, Electron build).
- **Integration Test Suite**: Write or expand a smoke-test suite covering core flows (login, send message, DM, voice call, friend request, admin action).
- **Regression Testing**: Run through all Phase 1–5 acceptance criteria to confirm nothing regressed.
- **Cross-Platform Verification**: Test on Windows (primary) and at least one secondary platform (macOS or Linux).

### 4. Bug Squashing
- **Bug Triage**: Review open GitHub Issues and known bugs. Categorize by severity (blocker, high, medium, low).
- **Fix Blockers & High-Priority Bugs**: Resolve all blocking and high-priority bugs before merge.
- **Stability Pass**: 30-minute soak test with active messaging, voice calls, and file uploads under realistic load (4–6 simulated users). No crashes, no memory leaks, no disconnections.

## Key Technical Decisions

| Feature | Choice | Rationale |
|---|---|---|
| **E2E Encryption** | Protocol-level (TLS + DTLS/SRTP) | No custom crypto — WebRTC and HTTPS provide battle-tested encryption. |
| **Auth Enforcement** | Convex `ctx.auth` + Clerk JWT validation | Zero-trust; every server function re-validates the caller. |
| **Staging Environment** | Separate Convex + Clerk projects | Isolates test data from production; safe for destructive testing. |
| **Bug Tracking** | GitHub Issues | Already established; single source of truth. |

## Out of Scope for Phase 6
- Adding new user-facing features.
- Rewriting or migrating databases.
- Implementing custom E2E encryption beyond what TLS/DTLS/SRTP provide.
- Scaling infrastructure beyond the staging environment.
