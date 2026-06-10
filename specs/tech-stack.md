# BaatCheet Tech Stack

## Frontend (Desktop Client)
- **Framework**: Electron (Chromium + Node.js)
- **Frontend UI**: React (for a fast, component-based, modern UI)
- **Styling**: Tailwind CSS (utility-first CSS framework for rapid dark-mode UI development)
- **State Management**: Zustand (lightweight, no boilerplate, performance-focused)
- **Build Tool**: Vite (blazing fast builds and HMR, perfect for iterative development)

## Backend (Server)
- **Runtime**: Node.js
- **Framework**: Fastify (significantly faster and more memory-efficient than Express)
- **Real-time Communication**: Socket.IO (for reliable, real-time text messages and WebRTC signaling)
- **Authentication**: Clerk (as specified: username, PFP, secure accounts)
- **Database & File Storage**: [Convex](https://www.convex.dev/) (Free tier. Replaces PostgreSQL/Redis/S3 by providing a real-time database, file storage, and server functions out of the box).

## Voice & Video (WebRTC)
- **Signaling**: Custom Socket.IO signaling server.
- **Media Server (Future/Scaling)**: Initially peer-to-peer (mesh) or selective forwarding unit (SFU) via Mediasoup for group calls.
- **Encryption**: DTLS/SRTP (protocol-level standard for WebRTC).

## DevOps & Tooling
- **Package Manager**: npm
- **Type Safety**: TypeScript (across the entire stack to reduce bugs and improve DX)
- **Linting**: ESLint + Prettier
- **Version Control**: Git
