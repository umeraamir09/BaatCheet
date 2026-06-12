# Auth Migration & User Identity - Implementation Plan

## Task Group 1: Auth System Migration Setup
1. Remove Clerk SDK and all Clerk-related imports, providers, and middleware.
2. Install and configure Convex Auth (`convex auth`) with the Convex backend.
3. Set up Convex Auth session management and token handling on the server (Fastify).
4. Set up Convex Auth client-side provider in the React/Electron app.
5. Create temporary dual-auth middleware to allow rollback during development.
6. Verify basic sign-up and sign-in flow with email/password via Convex Auth.

## Task Group 2: Discord OAuth Implementation
1. Register a Discord OAuth2 application and configure redirect URIs.
2. Implement the Discord OAuth2 authorization code flow on the server.
3. Implement Discord token exchange and user profile fetching (username, avatar, discriminator).
4. Wire Discord OAuth as a Convex Auth provider.
5. Build the Discord login button and flow in the Electron client.
6. Test full Discord sign-up and sign-in end-to-end.

## Task Group 3: User Schema Updates
1. Redesign the user schema in Convex:
   - `username`: string, lowercase, alphanumeric + underscores only, unique, used for friend adding.
   - `displayName`: string, shown in all UI lists and messages.
   - `avatarUrl`: string, profile picture URL.
   - `discordId`: string (optional), linked Discord account ID.
   - `authProvider`: enum, tracks which provider the user signed up with.
2. Implement username validation (no capitals, no spaces, no special characters except underscores).
3. Implement username uniqueness checks at sign-up.
4. Build the sign-up flow:
   - If Discord OAuth: offer to auto-fetch displayName and avatar from Discord.
   - If email/password: prompt user to enter username and displayName manually.
5. Write Convex mutations and queries for the new user schema.

## Task Group 4: UI Component Updates
1. Update all message components to render `displayName` instead of the old username.
2. Update friend list, server member list, and DM list to show `displayName` (with `@username` on hover or in profile cards).
3. Update the friend-add flow to search by `username` only.
4. Update user profile/settings panel to allow editing `displayName` and `username` (with validation).
5. Update avatar rendering to use the new `avatarUrl` field.
6. Remove all remaining Clerk UI components and references.

## Task Group 5: Data Migration & Testing
1. Write a one-time Convex migration script to transform any existing test/seed data to the new schema.
2. Run full regression tests: sign-up, sign-in, messaging, DMs, friend adding, voice calls.
3. Performance test the new auth flow (login latency, token refresh, session persistence).
4. Verify Convex Auth token refresh and session persistence across Electron app restarts.
5. Remove the dual-auth middleware from Task Group 1.
6. Final security review of the auth flow (token storage, CSRF, OAuth state validation).
