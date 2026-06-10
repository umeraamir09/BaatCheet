# BaatCheet Roadmap

## Phase 1: The Walking Skeleton
*Goal: A working "hello world" that we can iterate on.*
- [x] Initialize Electron + Vite + React project structure.
- [x] Set up Tailwind CSS and a basic dark-mode theme.
- [x] Initialize Node.js + Fastify backend with TypeScript.
- [x] Basic Socket.IO connection between client and server (bi-directional ping).
- [x] Integrate Clerk for basic authentication (redirect to a home screen).

## Phase 2: The Texting Backbone
*Goal: Friends can text each other in real-time.*
- [x] Design and implement database schema (Users, Messages, Channels, DirectMessages).
- [x] Build "Servers" or "Groups" UI (sidebar list of servers, list of channels).
- [x] Implement Real-time Messaging in Text Channels (sending, receiving, rendering).
- [x] Implement Direct Messages (DMs) (creating a DM thread, sending/receiving messages).
- [x] Basic message features: Replying and Editing.

## Phase 3: Image & Reaction Basics
*Goal: Richer text communication and basic message interactions.*
- [x] Image upload and display in chat (AWS S3 / MinIO integration).
- [x] Message deletions (soft delete in DB, remove from UI in real-time).
- [x] Message Reactions (emoji reactions to specific messages).
- [x] Refine UI styling for all new components.

## Phase 4: The Voice Core
*Goal: Friends can hear each other.*
- [x] Establish WebRTC Peer Connection between two users.
- [x] Implement Socket.IO signaling logic (offer, answer, ICE candidates).
- [x] Build the Voice Channel UI (Join/Leave, list of current speakers, mute/deafen buttons).
- [x] Implement 1-to-1 Direct Voice Call functionality.
- [x] Group Voice Call setup (mesh or basic SFU).

## Phase 5: Control & Polish
*Goal: Make it feel like a real application.*
- [x] Server/Group administration (Admins, Mods, roles, permissions).
- [x] Friend adding via username (search, friend request, accept/decline).
- [x] Settings Panel (Configuring keybindings for mute/deafen, audio input/output devices).
- [x] Audio optimization and noise suppression for voice chat.
- [x] Performance profiling of the Electron app (fixing memory leaks, high CPU usage).

## Phase 6: The Final Lockdown
*Goal: Ensure security and stability before shipping.*
- [ ] End-to-end encryption review.
- [ ] General security audit (authentication, authorization, WebRTC security).
- [ ] Staging environment testing.
- [ ] Bug squashing and final polish.
