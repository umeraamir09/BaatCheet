# Phase 4 Requirements: The Voice Core

## Context & Objectives
Phase 4 introduces real-time voice communication into BaatCheet. Building on the existing Socket.IO infrastructure and Fastify backend, we bring WebRTC peer connections to life — enabling both server-based voice channels and direct 1-to-1 voice calls. Performance remains the north star: audio must feel instantaneous and invisible while gaming.

## Scope & Features

### 1. WebRTC Peer Connection (Foundation)
- Establish browser-native WebRTC `RTCPeerConnection` instances between participants.
- Handle the full ICE negotiation lifecycle: gathering, trickling candidates, and connectivity checks.
- Use DTLS/SRTP (built into WebRTC) for encryption — no additional encryption layer needed.

### 2. Socket.IO Signaling
- Extend the existing Fastify + Socket.IO server with dedicated voice signaling events:
  - `voice:join-channel` / `voice:leave-channel`
  - `voice:offer` / `voice:answer`
  - `voice:ice-candidate`
  - `voice:call-request` / `voice:call-accept` / `voice:call-reject` (for DM calls)
- No new infrastructure — signaling runs entirely on the existing Socket.IO connection.

### 3. Media Server — Mediasoup SFU
- Integrate **Mediasoup** as a Selective Forwarding Unit (SFU) on the Fastify backend to support all group sizes without mesh overhead.
- Each voice channel will have a Mediasoup `Router` instance.
- Clients produce audio tracks; the SFU selectively forwards them to all other participants.
- This avoids the N² upload problem of mesh and future-proofs group calls.

### 4. Server Voice Channels
- Users can join a voice channel from the server's channel sidebar.
- The voice channel UI shows: a list of currently connected speakers, individual mute/unmute status indicators, and Join/Leave controls.
- Joining a voice channel does not interrupt the active text channel view.

### 5. Direct 1-to-1 Voice Calls
- Users can initiate a DM voice call from the DM thread header.
- The recipient sees a call request notification/banner and can Accept or Reject.
- An accepted call opens a minimal in-app call overlay (caller name, mute/deafen, hang-up button).
- Calls use the same Mediasoup SFU infrastructure for consistency and future extensibility.

### 6. Voice Channel UI (Mute / Deafen)
- Mute: stops transmitting local audio to the SFU.
- Deafen: mutes all incoming audio tracks locally.
- Keyboard shortcut bindings (deferred to Phase 5 settings panel, but state must be wirable).

## Key Technical Decisions
| Decision | Choice | Rationale |
|---|---|---|
| Voice Architecture | Mediasoup SFU | Scales cleanly for groups; avoids N² mesh overhead; reusable for Phase 5 |
| Signaling Transport | Existing Socket.IO on Fastify | Zero new infra; already authenticated and connected |
| Encryption | DTLS/SRTP (WebRTC standard) | Protocol-level, no extra work required |
| Call Scope | Voice channels + DM 1-to-1 | Full Phase 4 goal as per roadmap |
| UI Approach | In-channel overlay, non-disruptive | Must not interrupt the text/gaming experience |

## Out of Scope for Phase 4
- Video calls
- Screen sharing
- Noise suppression (deferred to Phase 5)
- Keybinding configuration (deferred to Phase 5)
- SFU scaling / clustering (Mediasoup worker pools beyond single-server)
