# Plan: Walking Skeleton

*Date: 2025-01-15*
*Phase: Phase 1 of BaatCheet Roadmap*

## Overview
We are building the minimal, end-to-end scaffold of the BaatCheat application. This includes the Electron desktop shell, the Vite + React + Tailwind frontend, the Convex backend, real-time communication via Socket.IO, and Clerk authentication. By the end of this phase, a developer should be able to run the app, log in, and see a real-time chat message appear on the screen.

---

## 1. Project & Tooling Setup
- [x] Initialize the monorepo root with a package manager (pnpm workspaces or npm workspaces).
- [x] Create `apps/desktop/` directory for the Electron + Vite + React client.
- [x] Create `apps/server/` directory for the Fastify + Socket.IO backend.
- [ ] Set up shared TypeScript configuration at the root.
- [x] Configure ESLint + Prettier for code quality and consistency.
- [x] Add root-level scripts for `dev`, `build`, and `lint`.

## 2. Electron + Vite + React + Tailwind Shell
- [x] Configure Vite for Electron main and renderer processes.
- [x] Set up React with TypeScript in the renderer process.
- [x] Install and configure Tailwind CSS with a custom dark-mode theme (respecting the "minimal, modern, and sleek" requirement from `idea.md`).
- [x] Create a basic window manager in Electron (main process).
- [x] Verify the app launches with a basic "Hello BaatCheet" UI.

## 3. Convex Integration (Backend & Database)
- [x] Initialize Convex in the project.
- [x] Define the initial schema for the Walking Skeleton: `messages` (id, text, senderId, createdAt).
- [x] Create a Convex query to fetch messages.
- [x] Create a Convex mutation to send a message.
- [ ] Set up the Convex dev environment and confirm the dashboard is accessible.

## 4. Clerk Authentication Integration
- [x] Sign up for a Clerk account and retrieve the API keys.
- [x] Wrap the React app with `<ClerkProvider>`.
- [x] Implement a `SignIn` and `SignUp` component flow.
- [x] Implement a `UserButton` and `useAuth` hook for session management.
- [x] Protect the main application routes with a `RequireAuth` wrapper.
- [ ] Implement a full login/logout flow that persists session state across app restarts.

## 5. Real-Time Chat with Socket.IO
- [x] Initialize Socket.IO in the Fastify server.
- [x] Connect the Electron renderer to the Socket.IO server.
- [x] Implement a `message:send` event that triggers the Convex `sendMessage` mutation.
- [x] Implement a `message:receive` event that broadcasts the new message to all connected clients.
- [x] Build a basic `ChatWindow` component in React that displays messages and allows sending new ones.
- [ ] Verify end-to-end flow: User A sends a message, it appears instantly on User B's screen.

## 6. Final Integration & Health Check
- [ ] Ensure all environment variables (Clerk, Convex) are correctly injected in both main and renderer processes.
- [ ] Add a pre-build check script to verify TS compilation.
- [ ] Create a concise README.md in `apps/desktop/` and `apps/server/` with startup instructions.
