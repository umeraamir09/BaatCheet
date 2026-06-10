# Phase 5 Implementation Plan: Control & Polish

## Task Group 1 — Server Administration (Backend & UI)
1. **Convex Schema Update**: Update the database schema to include a `role` field (`"owner" | "admin" | "member"`) on the server/channel membership relationship.
2. **Convex Functions**:
   - Implement query `members:list` to fetch all members of a server with their roles.
   - Implement mutation `members:updateRole` (promotes/demotes between admin and member, validated by owner role check).
   - Implement mutation `members:kick` (removes user from server, validated by admin/owner role checks).
   - Implement mutation `members:transferOwnership` (changes owner role, validates that caller is the current owner).
3. **Admin Actions**: Update message deletion mutations to allow the server owner or admins to delete any message in the server channels.
4. **UI Settings Component**:
   - Create a `ServerSettings` modal containing a "Members" tab.
   - For members, render user profile cards with their current role badge.
   - For owners/admins, display dynamic controls (e.g., "Demote", "Promote", "Kick") via click context menu next to eligible users.

## Task Group 2 — Friend System (Adding & Managing Friends)
1. **Convex Friends Table**:
   - Create a `friends` table mapping `userA` (sender), `userB` (receiver), and `status` (`"pending" | "accepted"`).
   - Add indices for querying relationships by sender or receiver.
2. **Convex Queries & Mutations**:
   - Implement `friends:sendRequest` (searches for user by username, creates a pending entry).
   - Implement `friends:respondRequest` (updates status to accepted or deletes entry on decline/cancel).
   - Implement `friends:list` (returns all active friendships and pending requests for the authenticated user).
3. **Online Status Tracking**:
   - Extend the server's Socket.IO lifecycle to track active socket connections to Clerk user IDs.
   - Emit global `presence:update` events on Socket.IO when a user connects or disconnects.
   - Update Zustand store on client to maintain a real-time list of online friend user IDs.
4. **Friends UI Tab**:
   - Build a `FriendsView` component as the default view when no server or specific DM is selected.
   - Create sub-tabs: "Online", "All", "Pending", and "Add Friend".
   - Include search inputs for user-name lookups and instant friend request triggers.

## Task Group 3 — Settings Panel & Audio Device Routing
1. **Settings Overlay UI**:
   - Build a modal overlay component `/components/settings/SettingsModal` accessible from the user status bar (bottom left).
   - Create tabs: "Voice Settings" and "Keybindings".
2. **Audio Device Selection**:
   - Utilize `navigator.mediaDevices.enumerateDevices()` to populate select lists for microphones (input) and speakers (output).
   - Store chosen device IDs in local storage.
   - Create helper `updateAudioStream` to apply the selected device ID to the active `getUserMedia` constraint when starting audio production.
3. **Audio Routing (Output)**:
   - For audio outputs, implement `HTMLAudioElement.setSinkId(deviceId)` (if supported by Chromium) on remote user audio streams to route audio to the selected output device.

## Task Group 4 — Global Hotkeys (Electron IPC Layer)
1. **IPC Main-Process Handlers**:
   - In `apps/desktop/src/main/index.ts`, define listeners for registering and unregistering global hotkeys using Electron's `globalShortcut` API.
   - Create an IPC message `shortcut:triggered` sent to the renderer process when a hotkey is pressed.
2. **IPC Renderer Integration**:
   - Create a helper listener in the React application that hooks into the window IPC object.
   - Register default shortcuts (`Ctrl+Shift+M` for mute, `Ctrl+Shift+D` for deafen) on app initialization.
3. **Zustand Action Mapping**:
   - Map `shortcut:triggered` event to the `useVoice` store to toggle the `muted` or `deafened` state.
   - Add hotkey configuration UI in the Settings Panel allowing users to capture keystrokes and save custom global hotkeys.

## Task Group 5 — Audio Optimization & WebRTC Configuration
1. **Native Constraints Tuning**:
   - Configure local media stream properties:
     ```javascript
     {
       audio: {
         deviceId: selectedInputDeviceId ? { exact: selectedInputDeviceId } : undefined,
         echoCancellation: true,
         noiseSuppression: true,
         autoGainControl: true
       }
     }
     ```
   - Expose settings toggles for these three constraints in the Voice Settings UI.
2. **Opus Bitrate Limitation**:
   - Configure the WebRTC SDP or Mediasoup transport options to enforce a specific maximum audio bitrate (e.g., limit to 32kbps mono instead of defaulting to stereo 64kbps+).

## Task Group 6 — Performance Profiling & Leak Diagnostics
1. **Component and Hook Review**:
   - Ensure all `useEffect` hooks in the voice hook and signaling modules clean up their event listeners, intervals, and observers.
   - Validate that closing a voice channel immediately calls `.stop()` on all local media tracks.
2. **Memory Leak Audit**:
   - Perform a 30-minute stress test with active text typing and voice signaling.
   - Capture Heap Snapshots in Chrome DevTools to trace potential memory leak patterns in React states, Socket.IO channels, or Electron IPC.
3. **Connection Resilience**:
   - Implement automatic retry loops with exponential backoff on Socket.IO signal drops.
   - Ensure WebRTC renegotiates and recovers under 2 seconds when network status changes.
