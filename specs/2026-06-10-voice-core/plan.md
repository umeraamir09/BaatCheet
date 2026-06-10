# Phase 4 Implementation Plan: The Voice Core

## Task Group 1 — Mediasoup SFU Setup (Backend)
1. Install `mediasoup` as a dependency on the Fastify server (`apps/server`).
2. Initialise a Mediasoup `Worker` on server startup; configure `rtcMinPort`/`rtcMaxPort` and media codecs (Opus for audio).
3. Implement a `RoomManager` service that maps channel IDs → Mediasoup `Router` instances (created lazily on first join, destroyed when last participant leaves).
4. Expose RTP capabilities endpoint / helper so clients can query supported codecs before connecting.

## Task Group 2 — Socket.IO Signaling Layer (Backend)
1. Add a `voice` Socket.IO namespace or extend the existing namespace with voice-specific event handlers.
2. Implement `voice:join-channel` — create or retrieve a `Router` for the channel, create a server-side `WebRtcTransport` (send + receive) for the joining client, and emit back transport parameters.
3. Implement `voice:connect-transport` — finalise the DTLS handshake by calling `transport.connect()` with the client's DTLS parameters.
4. Implement `voice:produce` — create a Mediasoup `Producer` for the client's audio track; notify other participants via `voice:new-producer`.
5. Implement `voice:consume` — create a `Consumer` for a remote producer and send back consumer parameters to the requesting client.
6. Implement `voice:leave-channel` — close transports/producers/consumers and notify remaining participants via `voice:peer-left`.
7. Implement DM call signaling events: `voice:call-request`, `voice:call-accept`, `voice:call-reject`, `voice:call-ended`.

## Task Group 3 — WebRTC Client Logic (Frontend)
1. Install `mediasoup-client` in the desktop app.
2. Create a `useVoice` hook (Zustand-backed or standalone) managing:
   - Device loading (RTP capabilities)
   - Send transport creation and connection
   - Receive transport creation and connection
   - Producer management (audio track)
   - Consumer management (remote audio tracks)
3. Wire up all signaling event listeners to the Socket.IO client.
4. On join: load device → create transports → produce local audio → consume existing producers.
5. On peer join: auto-consume their new producer when `voice:new-producer` fires.
6. Implement mute (pause producer) and deafen (pause all consumers) logic.

## Task Group 4 — Voice Channel UI (Server Channels)
1. Add a `type: "voice"` channel indicator in `ChannelSidebar` (already in schema; render with a speaker icon instead of `#`).
2. Clicking a voice channel calls `useVoice.joinChannel()` instead of switching the active text channel.
3. Render a "You are in voice" persistent bar at the bottom of the sidebar showing channel name + Leave button.
4. In the main area, when in a voice channel show a `VoiceChannelView` component: a grid/list of connected participants with their name, avatar, and mute state indicator.
5. Mute/Deafen buttons in the bottom voice bar (or overlaid in the view).

## Task Group 5 — Direct 1-to-1 Voice Call UI
1. Add a phone icon button to the DM thread header to initiate a call (`voice:call-request`).
2. Implement an `IncomingCallBanner` component shown to the callee with Accept / Reject buttons.
3. Implement an `ActiveCallOverlay` component (compact, non-disruptive) shown to both parties during an active call:
   - Caller's name and avatar
   - Mute toggle
   - Hang-up button
4. On hang-up, emit `voice:call-ended`, clean up transports, and dismiss the overlay.

## Task Group 6 — Polish & Integration
1. Handle edge cases: tab/app close while in voice (auto-leave), network drop (detect via ICE disconnected state → show reconnecting indicator).
2. Ensure voice state is cleared in Zustand when navigating away or logging out.
3. Validate no audio track leaks (always stop MediaStream tracks on leave/hangup).
