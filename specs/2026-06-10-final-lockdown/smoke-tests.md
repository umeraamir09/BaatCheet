# Phase 6 Smoke Tests

Run against the staging environment before merging. All tests are manual until a test framework is configured.

## Prerequisites
1. Staging Convex project (`baatcheet-staging`) deployed
2. Staging Clerk app configured
3. Two test user accounts created in Clerk
4. Signaling server running (`npm run dev` in `apps/server` with `CLERK_SECRET_KEY` set)
5. Desktop app running in staging mode

## Test Suite

### 1. Authentication
- [ ] **Sign Up**: Create a new account via Clerk sign-up flow. User is redirected to home screen.
- [ ] **Sign In**: Log in with existing credentials. Home screen loads without errors.
- [ ] **Session Persistence**: Close and reopen the app. User remains logged in.
- [ ] **Sign Out**: Sign out. User is redirected to sign-in page.

### 2. User Sync
- [ ] **Auto-sync**: After login, the user appears in the `users` table in Convex (check via Convex dashboard).
- [ ] **Profile Data**: Username and avatar URL are synced correctly.

### 3. Server Management
- [ ] **Create Server**: Click "Create Server", enter a name, verify it appears in the sidebar.
- [ ] **List Servers**: The created server appears in the server list of the creator.
- [ ] **Invite Code**: Generate an invite code from Server Settings → Invites.
- [ ] **Join via Invite**: The second user joins the server using the invite code.
- [ ] **Server Members**: Both users appear in the Members tab of Server Settings.

### 4. Text Messaging (Channel)
- [ ] **Send Message**: User 1 sends a message in a text channel. User 2 sees it appear in real-time.
- [ ] **Message Persistence**: Refresh the app. Messages are still visible.
- [ ] **Edit Message**: User 1 edits a message. The "(edited)" indicator appears.
- [ ] **Delete Message**: User 1 deletes a message. It disappears from both users' views.

### 5. Direct Messages
- [ ] **Create DM**: From the Friends view, click "Message" on a friend. A DM thread opens.
- [ ] **Send DM**: Send a message in the DM. The recipient sees it in real-time.
- [ ] **DM Persistence**: The DM thread appears in the DM sidebar on next login.

### 6. Friends System
- [ ] **Send Request**: User 1 searches for User 2's username and sends a friend request.
- [ ] **Receive Request**: User 2 sees the pending request in the "Pending" tab.
- [ ] **Accept Request**: User 2 accepts. Both users see each other in their friend list.
- [ ] **Online Status**: Both users show as online (green indicator).
- [ ] **Remove Friend**: User 1 removes User 2 as a friend. The entry disappears.

### 7. Voice Channels
- [ ] **Join Voice Channel**: User 1 clicks a voice channel to join. Status shows "Voice Connected".
- [ ] **Peer Discovery**: User 2 joins the same channel. Both users see each other.
- [ ] **Speaking Indicator**: Moving audio input triggers the green speaking ring.
- [ ] **Mute/Deafen**: Mute and deafen buttons work and reflect in real-time.
- [ ] **Leave Channel**: Click "Disconnect". Both users are removed from the channel.

### 8. Admin Actions
- [ ] **Promote to Admin**: Server owner promotes a member to admin. Role badge updates.
- [ ] **Demote to Member**: Server owner demotes an admin. Role badge updates.
- [ ] **Kick Member**: Admin kicks a member. The kicked user's sidebar removes the server.
- [ ] **Transfer Ownership**: Owner transfers ownership. New owner sees owner controls.

### 9. Security Verification
- [ ] **Unauthenticated Access**: Open DevTools console, try calling a Convex mutation without auth. Returns 401.
- [ ] **Input Validation**: Send a message with >10,000 characters. Mutation rejects it.
- [ ] **File Upload Restriction**: Try uploading a non-image file. Upload is rejected by the server.
- [ ] **Socket Auth**: Connect to Socket.IO without a token. Connection is rejected with "Authentication required".

### 10. Regression — Phases 1–5
- [ ] Phase 2: Text messaging in channels and DMs works.
- [ ] Phase 3: Image uploads and emoji reactions render correctly.
- [ ] Phase 4: Voice channels and DM calls connect and stream audio.
- [ ] Phase 5: Server settings, friend system, audio device selection, and keybindings function.

## Test Sign-off

All items above must pass before merging the `phase/6-final-lockdown` branch.

| Tester | Date | Result |
|--------|------|--------|
| | | ✅ / ❌ |
