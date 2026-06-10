# Phase 4 Validation Plan: The Voice Core

## Pre-Merge Checklist

### 1. Mediasoup SFU (Backend)
- [ ] Server starts cleanly with Mediasoup worker running (no crashes, no EADDRINUSE for RTC ports).
- [ ] A `Router` is created on first participant joining a voice channel and destroyed when the last participant leaves (no resource leaks).
- [ ] Server logs show correct producer/consumer lifecycle events (create → active → close).

### 2. Signaling Correctness
- [ ] DTLS transport connect succeeds for both send and receive transports without errors.
- [ ] `voice:produce` creates a server-side producer whose `id` is returned to the client.
- [ ] `voice:consume` returns valid consumer parameters that allow the client to resume playback.
- [ ] All other participants are notified via `voice:new-producer` within 500 ms of a new peer joining.
- [ ] `voice:peer-left` is emitted to remaining participants when someone disconnects.

### 3. Audio Quality (Voice Channels)
- [ ] Two clients can hear each other clearly in a server voice channel with no audible glitches.
- [ ] Three or more clients can communicate simultaneously through the SFU without echo or dropout.
- [ ] Muting a participant stops their audio arriving at all other consumers (no bleed-through).
- [ ] Deafen on a client mutes all incoming audio locally without affecting what others hear.

### 4. Direct 1-to-1 Calls
- [ ] Call request banner appears on the callee's screen within 1 second of initiation.
- [ ] Accepting the call establishes audio in both directions within 3 seconds.
- [ ] Rejecting the call dismisses the banner for the callee and shows "Call declined" to the caller.
- [ ] Hanging up cleanly closes transports; no `MediaStream` tracks remain active after hang-up (verified in DevTools).

### 5. Resource & Performance Checks
- [ ] Closing the Electron window while in a voice call does not leave orphaned Mediasoup transports on the server (verify via server logs or Mediasoup inspector).
- [ ] CPU usage during a 2-person voice call stays within acceptable bounds relative to idle (target: < 5% additional CPU on the Electron process).
- [ ] No memory growth over a 10-minute voice session (profile with Chrome DevTools memory snapshot).
- [ ] Reconnection: simulate a brief network interruption (Wi-Fi toggle); confirm ICE renegotiates and audio resumes without requiring a manual rejoin.

### 6. UI/UX Acceptance
- [ ] The "You are in voice" persistent bar is visible in the sidebar while in a channel; clicking Leave exits cleanly.
- [ ] Participant list in `VoiceChannelView` updates in real-time as people join and leave.
- [ ] Mute state indicator (icon) updates for remote participants within 500 ms.
- [ ] The call overlay for DM calls does not block or obscure the text chat; it is dismissable only via Hang Up.

### Merge Criteria
All items above must be checked before this branch is merged. Audio must feel instantaneous — if there is perceptible delay (> ~150 ms round-trip perceived latency) under normal local network conditions, the implementation is not ready to merge.
