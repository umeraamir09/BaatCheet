# Auth Migration & User Identity - Validation

## Functional Validation

### Auth Flow
- [ ] User can sign up with Discord OAuth (first-time login creates account, fetches displayName + avatar from Discord).
- [ ] User can sign up with email/password via Convex Auth.
- [ ] User can sign in with a previously created Discord OAuth account.
- [ ] User can sign in with a previously created email/password account.
- [ ] User can sign out and sign back in without issues.
- [ ] Session persists across Electron app restarts (no re-login required).
- [ ] Token refresh works silently without interrupting the user session.
- [ ] No Clerk references remain in the codebase (imports, env vars, config).

### Username & displayName
- [ ] `username` accepts only lowercase letters, numbers, and underscores.
- [ ] `username` rejects capitals, spaces, and special characters.
- [ ] `username` uniqueness is enforced at sign-up (duplicate rejected with clear error).
- [ ] `displayName` is displayed in all message components, friend lists, server member lists, and DM lists.
- [ ] `@username` is shown on hover or in profile cards for identification.
- [ ] Friend search works by `username` only.
- [ ] Friend requests can be sent and received using the new `username` format.

### Discord Sync
- [ ] Discord `displayName` is correctly fetched and set on sign-up.
- [ ] Discord avatar URL is correctly fetched and set on sign-up.
- [ ] Avatar renders correctly in all UI components.

## Security Validation
- [ ] Discord OAuth state parameter is validated to prevent CSRF.
- [ ] Discord tokens are stored server-side only (not accessible from Electron renderer).
- [ ] Convex Auth tokens are stored securely (Electron secure storage or httpOnly cookies).
- [ ] Authenticated routes are protected and reject unauthenticated requests.
- [ ] Rate limiting is applied to auth endpoints (sign-up, sign-in).

## Performance Validation
- [ ] Login flow (sign-in) completes in under 2 seconds on a standard connection.
- [ ] Discord OAuth flow (redirect + callback + session creation) completes in under 4 seconds.
- [ ] Token refresh is silent and completes in under 500ms.
- [ ] No memory leaks in the Electron app after repeated sign-in/sign-out cycles (verified via DevTools memory profiling).
- [ ] Auth-related network requests are minimal (no redundant token fetches or polling).

## Regression Validation
- [ ] All existing features still work: real-time messaging, DMs, image upload, reactions, voice calls, server/group admin.
- [ ] No TypeScript errors across the full stack (`npm run typecheck` or equivalent passes clean).
- [ ] No ESLint errors (`npm run lint` passes clean).
- [ ] Electron app builds successfully for the target platform.

## Merge Criteria
All checkboxes above must be checked. The branch is mergeable when:
1. Auth migration is complete (Clerk fully removed, Convex Auth fully operational).
2. Discord OAuth is functional end-to-end.
3. New username/displayName system is working across all UI components.
4. All security, performance, and regression checks pass.
5. Code review is approved.
