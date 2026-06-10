# BaatCheet

**Zero Lag. Zero Compromise. Maximum Performance.**

A lightweight, real-time communication desktop app for gamers who demand performance. Built as a faster, leaner alternative to Discord — no bloat, no lag, just pure communication.

---

## Features

### Messaging
- Real-time text messaging in server channels and direct messages
- Reply, edit, and delete messages
- Emoji reactions with quick-reaction bar and full emoji picker
- Image uploads with preview (JPEG, PNG, GIF, WebP)

### Voice
- Crystal-clear voice chat in server voice channels via WebRTC + Mediasoup SFU
- One-to-one DM calls with call request/accept/decline flow
- Mute and deafen controls with configurable global hotkeys
- Voice activity detection (VAD) with speaking indicators
- Echo cancellation, noise suppression, and auto-gain control

### Servers & Community
- Discord-style server management with text and voice channels
- Role-based permissions: Owner, Admin, Member
- Invite link system with expiry and max-uses limits
- Member management: kick, promote, demote, transfer ownership

### Social
- Friend system: search, send, accept, and decline requests
- Online presence indicators
- Friends view with Online, All, Pending, and Add Friend tabs
- Launch DMs directly from friends list

### User Experience
- Dark-themed UI optimized for gaming setups
- Custom audio device selection (microphone, speaker)
- Configurable keybindings for mute and deafen
- Built with performance in mind — minimal resource usage while gaming

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | **Electron** 42 |
| Frontend | **React 19**, **TypeScript**, **Vite 8**, **Tailwind CSS 4** |
| State Management | **Zustand** |
| Authentication | **Clerk** |
| Real-time Database | **Convex** (cloud-hosted) |
| Voice Engine | **Mediasoup** 3 (WebRTC SFU) |
| Signaling | **Socket.IO** |
| Backend | **Fastify** (Node.js) |
| File Storage | Convex File Storage |
| Audio Processing | Web Audio API (AnalyserNode VAD) |

---

## Project Structure

```
BaatCheet/
├── apps/
│   ├── desktop/                 # Electron + React frontend
│   │   ├── convex/              # Convex serverless functions (DB layer)
│   │   ├── src/
│   │   │   ├── main/            # Electron main process
│   │   │   └── renderer/        # React UI app
│   │   │       ├── components/  # UI components
│   │   │       ├── hooks/       # React hooks (app store, socket, voice)
│   │   │       ├── lib/         # Client library setup
│   │   │       └── pages/       # Auth pages
│   │   └── package.json
│   └── server/                  # Node.js + Fastify + Socket.IO backend
│       └── src/
│           ├── index.ts         # HTTP + WebSocket + Mediasoup signaling
│           └── voiceManager.ts  # Mediasoup worker/router manager
├── specs/                       # Planning documents & validation
├── package.json                 # Root monorepo (npm workspaces)
└── idea.md                      # Original project vision
```

---

## Getting Started

### Prerequisites

- **Node.js** 22+
- **Bun** (for workspace scripts)
- A **Convex** project (free tier works)
- A **Clerk** application

### Environment Setup

Copy `.env.example` to `.env` and fill in the values:

```env
# Clerk
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=
VITE_CLERK_PUBLISHABLE_KEY=

# Convex
CONVEX_URL=
CONVEX_DEPLOY_KEY=

# Server
SERVER_PORT=3001
CORS_ORIGIN=http://localhost:5173

# Mediasoup
MEDIASOUP_LISTEN_IP=127.0.0.1

# Client
VITE_SOCKET_URL=http://localhost:3001
```

### Install & Run

```bash
# Install dependencies
bun install

# Run both desktop and server in development mode
bun run dev

# Or run them individually:
bun run dev:server
bun run dev:desktop
```

### Building for Production

```bash
bun run build
```

The desktop app can be packaged with Electron Builder:

```bash
cd apps/desktop
bun run build      # Builds + packages into NSIS installer
```

---

## Development Status

| Phase | Status | Description |
|---|---|---|
| 1. Walking Skeleton | Complete | Electron + Vite + React + Fastify + Socket.IO + Clerk |
| 2. Texting Backbone | Complete | DB schema, servers, channels, real-time messaging, DMs |
| 3. Image & Reactions | Complete | Image upload, message delete, emoji reactions |
| 4. Voice Core | Complete | WebRTC + Mediasoup SFU, voice channels, DM calls |
| 5. Control & Polish | Complete | Server admin, friends, settings, keybindings |
| 6. Final Lockdown | **In Progress** | Security audit, staging testing, bug fixing |

---

## License

MIT
