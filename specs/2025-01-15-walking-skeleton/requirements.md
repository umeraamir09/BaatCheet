# Requirements: Walking Skeleton

*Date: 2025-01-15*

## Scope
This phase is strictly about scaffolding. We are not building the final UI, the group management, or the voice features. We are building the *skeleton* upon which those features will hang.

## Decisions & Context
1. **Monorepo Structure**: We will use a monorepo to keep the desktop client and the backend server in sync. This simplifies shared types and build orchestration.
2. **Electron + Vite**: Vite provides an extremely fast development experience (HMR) which is critical for rapid iteration. Electron provides the native desktop window.
3. **Convex over Raw DB**: Using Convex's free tier simplifies our backend dramatically. We get a real-time database and serverless functions without managing a Postgres instance or Redis cache. This aligns with our mission to keep things fast, simple, and low-latency.
4. **Socket.IO for WebSocket Fallback**: While modern browsers support native WebSockets, Socket.IO provides automatic fallbacks and a robust event-based API which is perfect for real-time chat signaling. This will also be reused later for WebRTC signaling.
5. **Tailwind Dark Mode**: We will use Tailwind's built-in `dark` class strategy to enforce the sleek, minimal dark-mode UI specified in `idea.md` from day one.
6. **Clerk for Auth**: Clerk handles the complex security of authentication (session management, token rotation) so we can focus on the chat and voice features. It also supports usernames out of the box.

## Functional Requirements
- A user can launch the app and see a dark-themed window.
- A user can sign up and log in using Clerk.
- A user can send a text message in a single global chat room.
- Messages appear in real-time for all connected users.
- A user can log out, and their session is terminated.

## Non-Functional Requirements
- **Performance**: The Electron app should launch in under 3 seconds on a modern Windows machine.
- **Resilience**: If the Socket.IO connection drops, the app should attempt to reconnect automatically.
- **Security**: All API keys and secrets must be stored in environment variables, never hardcoded.
