# Phase 5 Validation Plan: Control & Polish

## Pre-Merge Checklist

### 1. Server Administration
- [ ] Server owner can promote a `Member` to `Admin` and demote an `Admin` back to `Member`.
- [ ] Server owner cannot be kicked or demoted by any other user, including admins.
- [ ] Admin can kick a `Member`; attempting to kick an `Owner` or another `Admin` returns an authorization error.
- [ ] Owner can transfer ownership to another member; the previous owner becomes an `Admin` afterward.
- [ ] Kicked users are removed from the server in real-time — their sidebar reflects the removal without a page reload.
- [ ] Owner and Admins can delete any message in any channel; Members can only delete their own messages.
- [ ] ServerSettings modal renders correctly with the Members tab populated for both owners and admins.

### 2. Friend System
- [ ] Searching a valid Clerk username returns the correct user profile without exposing private data.
- [ ] Searching a non-existent username returns an empty/no-result state gracefully.
- [ ] Sending a friend request creates a `pending` entry; the recipient sees it in their "Pending" tab in real-time.
- [ ] Accepting a friend request transitions both users' friend lists to show the other as an accepted friend.
- [ ] Declining a friend request removes the pending entry for both parties.
- [ ] Cancelling an outgoing request removes the `pending` entry from both sender and receiver.
- [ ] A friend who connects/disconnects updates the online indicator within 2 seconds (tracked via Socket.IO presence events).
- [ ] Clicking "Message" in the friend list opens or navigates to the existing DM thread with that user.

### 3. Settings Panel
- [ ] Settings modal opens and closes with a smooth transition animation (no layout shift or flicker).
- [ ] Microphone and speaker dropdowns are populated with all available system devices.
- [ ] Changing the microphone device during an active voice call switches the audio track without requiring a reconnect.
- [ ] Changing the output device routes remote audio to the newly selected speaker/headphone device.
- [ ] All settings (device selection, keybindings, audio toggles) persist across app restarts (loaded from local storage on mount).

### 4. Global Keybindings
- [ ] Default `Ctrl+Shift+M` mutes/unmutes the local microphone globally — verified by pressing the shortcut while BaatCheet is minimized and confirming the Mute indicator changes in the app.
- [ ] Default `Ctrl+Shift+D` toggles deafen globally — verified the same way.
- [ ] Custom keybinding can be captured, saved, and replaces the default without restarting the app.
- [ ] IPC message `shortcut:triggered` is received by the renderer process within 100ms of the hotkey press.
- [ ] No conflicting shortcut registrations cause Electron crashes or silent failures (error surfaced as a toast/notification).

### 5. Audio Optimization
- [ ] `echoCancellation`, `noiseSuppression`, and `autoGainControl` constraints are applied to the captured microphone stream (verified via `getConstraints()` in DevTools console).
- [ ] Each constraint toggle in the Settings Panel applies immediately to the active voice session (no full reconnect required).
- [ ] Opus bitrate is constrained appropriately; network bandwidth usage during a 2-person call is ≤ 64kbps total (measured via Chrome DevTools → Network → WebRTC internals, or `chrome://webrtc-internals`).
- [ ] Subjective quality: voice is clear and free of echo during a 5-minute test call between two clients.

### 6. Performance Profiling
- [ ] App CPU usage during idle (no call, no active typing) stays within a **5% increase** relative to baseline before Phase 5 code was added (measured via Windows Task Manager or Electron process metrics).
- [ ] 30-minute stress test with an active voice session and ongoing text chat shows **no memory growth trend** in the Heap Snapshot (compare snapshot at 5min vs 30min; delta must be < 10MB).
- [ ] All Socket.IO event listeners are removed on component unmount — confirmed via React DevTools Profiler and no duplicate listener warnings in console.
- [ ] All `MediaStream` tracks are stopped on voice leave/hang-up — confirmed by verifying no active microphone icon in the OS system tray after leaving voice.
- [ ] Simulating a network drop (disable/re-enable network adapter) and re-enabling within 5 seconds results in automatic WebRTC reconnection within **2 seconds** of network restoration without user intervention.

### 7. Integration & Regression
- [ ] Phase 2 text messaging still works correctly after all schema and Convex function updates.
- [ ] Phase 3 image uploads and emoji reactions still work correctly.
- [ ] Phase 4 voice channels and DM calls still function correctly with the new audio constraint settings applied.
- [ ] No new TypeScript compilation errors across `apps/desktop` and `apps/server`.
- [ ] ESLint passes with no new warnings introduced by Phase 5 code.

### Merge Criteria
All items above must be checked. In particular:
- Global hotkeys must function in full-screen game scenarios (not just when the BaatCheet window is focused).
- CPU increase must stay within the 5% idle cap — anything beyond is a blocker.
- No `MediaStream` or listener leaks may be present at merge time.
