# Auth Migration & User Identity - Requirements

## Context
BaatCheet currently uses Clerk for authentication. The tech stack specifies Convex as the backend platform (database, file storage, server functions). Migrating auth to Convex Auth consolidates the backend stack, reduces third-party dependencies, and gives us full control over the auth flow. Adding Discord OAuth aligns with the target audience (gamers) and simplifies sign-up.

The current user identity model uses a single username field. This is being split into two distinct fields to separate identity (friend adding) from presentation (display in chat/lists).

## Scope

### In Scope
- Full migration from Clerk to Convex Auth.
- Discord OAuth2 as a sign-in/sign-up provider.
- New dual-field identity: `username` (for friend adding) + `displayName` (for UI presentation).
- Full Discord profile sync: both `displayName` and `avatarUrl` fetched from Discord.
- Sign-up flow that offers Discord auto-fetch for displayName and avatar.
- Update all UI components to use the new identity fields.
- Update friend system to use the new `username` format.

### Out of Scope
- Multi-account support.
- Discord bot integration or server sync.
- Changing the friend system logic beyond the username format update.
- Migration of live production user data (app has no active users yet).

## Decisions

### 1. Username Format
- **Decision**: `username` is lowercase, no spaces, no special characters except underscores.
- **Rationale**: Simple, URL-safe, easy to type for friend adding. Matches gaming platform conventions.

### 2. displayName vs username
- **Decision**: `username` is used exclusively for friend adding (search, send request). `displayName` is shown everywhere in the UI (messages, lists, profile cards).
- **Rationale**: Separates identity from presentation. Users can have a clean `@handle` for adding friends while displaying a personalized name in chat.

### 3. Discord Profile Sync
- **Decision**: Full sync - both `displayName` and `avatarUrl` are fetched from Discord on sign-up.
- **Rationale**: Reduces friction during sign-up. Gamers expect their Discord identity to carry over. No active users to disrupt.

### 4. Auth Provider Strategy
- **Decision**: Convex Auth with Discord as an OAuth provider. Email/password also supported via Convex Auth.
- **Rationale**: Consolidates backend under Convex. Discord OAuth is the primary flow; email/password is the fallback.

### 5. Data Migration
- **Decision**: No live user data migration needed. Seed/test data will be transformed via a one-time script.
- **Rationale**: App has no active users. Clean slate allows us to avoid complex migration logic.

## Constraints
- Must align with mission: zero lag, minimalism, privacy.
- Auth flow must not add perceptible latency to login or session refresh.
- Discord OAuth tokens must be stored securely (server-side only, never exposed to the Electron renderer).
- All auth-related code must be TypeScript with full type safety.

## Dependencies
- Convex Auth (must be available and compatible with current Convex version).
- Discord Developer Portal (OAuth2 application registration).
- Existing Convex backend (already in tech stack).
