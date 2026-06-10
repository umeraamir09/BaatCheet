# Phase 5 Requirements: Control & Polish

## Context & Objectives
Building on the foundation of real-time messaging and the Voice Core, Phase 5 elevates BaatCheet into a mature, stable, and user-friendly communication tool. The key objective is to provide essential server management capabilities, social connections (friends), customizable user settings, high-quality audio, and rock-solid client performance. All features must be implemented with minimal resource overhead, ensuring the app remains lightweight and non-disruptive during gaming.

## Scope & Features

### 1. Server/Group Administration
- **Simple Role Hierarchy**: Hardcoded roles: `Owner`, `Admin`, and `Member`.
- **Permissions**:
  - `Owner`: Full access, can assign/remove `Admin` roles, transfer server ownership, kick members, edit server details (name, icon), and delete any message.
  - `Admin`: Can kick `Member` users, delete any chat message, and edit server details. Cannot kick the Owner or other Admins.
  - `Member`: Can read/write messages, join voice channels, and leave the server.
- **UI Management**: Simple member list view inside server settings showing roles and providing Kick / Promote / Demote context menus for authorized users.

### 2. Friend System (Adding via Username)
- **User Search**: Search for other users using their unique usernames (integrated with Clerk authentication).
- **Friend Requests**:
  - Send a friend request to an existing user.
  - Incoming request list: view incoming requests with Accept/Decline options.
  - Outgoing request list: view pending sent requests with Cancel option.
- **Friend List**: Renders all accepted friends with their online/offline status (tracked via active Socket.IO connection) and quick actions to send a DM or start a voice call.

### 3. Settings Panel
- **User Interface**: A sleek settings overlay (with modern transition/micro-animations) accessible from the user profile bar in the sidebar footer.
- **Audio Device Selection**:
  - Dynamic discovery of audio input (microphones) and output (speakers/headphones) devices using `navigator.mediaDevices.enumerateDevices()`.
  - Dropdown selectors to change active devices on the fly during voice calls.
- **Global Keybindings**:
  - Register global hotkeys (e.g., `Ctrl+Shift+M` to mute, `Ctrl+Shift+D` to deafen) through Electron's `globalShortcut` API.
  - These hotkeys must function globally even when the Electron app is minimized and the user is in-game.
  - Communicate hotkey triggers from the Electron Main process to the Renderer process via IPC (Inter-Process Communication).

### 4. Audio Optimization & Noise Suppression
- **Native Audio Processing**: Leverage native browser/WebRTC constraints when acquiring user media:
  - `echoCancellation: true`
  - `noiseSuppression: true`
  - `autoGainControl: true`
- **Configurable Settings**: Toggles in the Settings Panel to enable/disable these options individually for debugging or performance preferences.
- **Opus Codec Optimization**: Restrict audio bandwidth/bitrate in the Mediasoup SFU setup to preserve local CPU and network bandwidth (e.g., target 32kbps mono Opus for crisp voice with minimal footprint).

### 5. Performance Profiling & Bug Squashing
- **Resource Constraints**: Verify the Electron app is highly optimized and memory-efficient.
- **Leak Detection**: Clean up event listeners on unmount (React hook cleanups, Socket.IO listener removals, IPC listeners, and media stream tracks).
- **Graceful Failures**: Ensure robust connection retries for Socket.IO and WebRTC if the connection drops.

## Key Technical Decisions

| Feature | Choice | Rationale |
|---|---|---|
| **Role Hierarchy** | Hardcoded `Owner`, `Admin`, `Member` | Simple database schema in Convex; low memory overhead; no complex dynamic rules. |
| **Friend Requests** | Clerk usernames + Convex table | Matches authentic auth system; Clerk handles user identity, Convex holds relationships. |
| **Global Shortcuts** | Electron `globalShortcut` + IPC | Allows gamers to mute/deafen system-wide while in full-screen games. |
| **Audio Optimization** | Native WebRTC audio constraints | Zero additional CPU overhead from WASM/JS third-party noise cancellation libraries. |
| **Settings Storage** | Local Storage + Convex Sync | Instant local loading on startup; settings persist across devices. |

## Out of Scope for Phase 5
- Custom role creation with fine-grained checkbox permissions.
- Third-party noise-cancellation integrations (e.g., Krisp SDK or RNNoise WASM wrapper).
- Video-call optimizations or screen sharing settings.
- Global overlay rendering on top of running DirectX/OpenGL games (handled via system shortcuts and audio cues instead).
