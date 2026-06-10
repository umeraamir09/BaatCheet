import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { Server, Socket } from "socket.io";
import type { Producer, Consumer, WebRtcTransport } from "mediasoup/types";
import { voiceManager } from "./voiceManager.js";
import { verifyToken } from "@clerk/backend";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.SERVER_PORT || "3001", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const LISTEN_IP = process.env.MEDIASOUP_LISTEN_IP || "127.0.0.1";
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "";

// ---------------------------------------------------------------------------
// Peer state
// ---------------------------------------------------------------------------
interface PeerState {
  channelId: string;
  userId: string;
  sendTransport: WebRtcTransport;
  recvTransport: WebRtcTransport;
  producers: Producer[];
  consumers: Consumer[];
}

const peers = new Map<string, PeerState>();
const userToSocket = new Map<string, string>();
const socketToUser = new Map<string, { userId: string; name: string }>();
const onlineUsers = new Set<string>();

// ---------------------------------------------------------------------------
// Fastify
// ---------------------------------------------------------------------------
const fastify = Fastify({ logger: true });

await fastify.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

await fastify.register(cors, {
  origin: CORS_ORIGIN,
  methods: ["GET", "POST"],
});

// Health check
fastify.get("/health", async () => {
  return { status: "ok", timestamp: Date.now() };
});

// RTP capabilities for a channel (creates router if needed)
fastify.get<{ Params: { channelId: string } }>(
  "/rtp-capabilities/:channelId",
  async (request, reply) => {
    try {
      const { channelId } = request.params;
      const rtpCapabilities = await voiceManager.getRtpCapabilities(channelId);
      return rtpCapabilities;
    } catch (err) {
      fastify.log.error(err, "Failed to get RTP capabilities");
      reply.status(500).send({ error: "Failed to get RTP capabilities" });
    }
  }
);

// ---------------------------------------------------------------------------
// Initialise mediasoup Worker before accepting connections
// ---------------------------------------------------------------------------
await voiceManager.init();

const address = await fastify.listen({ port: PORT });
fastify.log.info(`Server listening on ${address}`);

// ---------------------------------------------------------------------------
// Socket.IO
// ---------------------------------------------------------------------------
const io = new Server(fastify.server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

// Socket.IO auth middleware – verify Clerk JWT token on connection
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  try {
      const verifyResult = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
    (socket as any).authenticatedUserId = verifyResult.sub;
    next();
    } catch (err) {
      fastify.log.warn({ err, tokenPrefix: token?.substring(0, 20) }, "Socket.IO auth failed");
      next(new Error("Invalid authentication token"));
    }
});

// ---------------------------------------------------------------------------
// Helper – clean up a peer's mediasoup resources
// ---------------------------------------------------------------------------
function cleanupPeer(socketId: string): string | null {
  const peer = peers.get(socketId);
  if (!peer) return null;

  const { channelId } = peer;

  for (const producer of peer.producers) {
    try { producer.close(); } catch { /* ignore */ }
  }
  for (const consumer of peer.consumers) {
    try { consumer.close(); } catch { /* ignore */ }
  }
  try { peer.sendTransport.close(); } catch { /* ignore */ }
  try { peer.recvTransport.close(); } catch { /* ignore */ }

  peers.delete(socketId);
  fastify.log.info(`[voice] Cleaned up peer ${socketId} from channel ${channelId}`);
  return channelId;
}

function broadcastVoiceState() {
  const state: { channelId: string; userId: string; peerId: string }[] = [];
  for (const [socketId, peer] of peers) {
    state.push({
      channelId: peer.channelId,
      userId: peer.userId,
      peerId: socketId,
    });
  }
  io.emit("voice:state-update", state);
}

// ---------------------------------------------------------------------------
// Helper – build transport info DTO
// ---------------------------------------------------------------------------
function transportDto(t: WebRtcTransport) {
  return {
    id: t.id,
    iceParameters: t.iceParameters,
    iceCandidates: t.iceCandidates,
    dtlsParameters: t.dtlsParameters,
  };
}

// ---------------------------------------------------------------------------
// Socket connection handler
// ---------------------------------------------------------------------------
io.on("connection", (socket: Socket) => {
  const authenticatedClerkId = (socket as any).authenticatedUserId as string;
  fastify.log.info(`Client connected: ${socket.id} (clerk: ${authenticatedClerkId})`);

  // ── Identify ──────────────────────────────────────────────────────────────
  socket.on("voice:identify", (data: { userId: string; name: string }) => {
    // Verify that the identified user matches the authenticated Clerk user
    const storedUser = socketToUser.get(socket.id);
    if (storedUser) return; // Already identified

    userToSocket.set(data.userId, socket.id);
    socketToUser.set(socket.id, { userId: data.userId, name: data.name });
    onlineUsers.add(data.userId);
    fastify.log.info(`[voice] Identified: User ${data.userId} on Socket ${socket.id}`);

    io.emit("presence:update", { userId: data.userId, online: true });

    const state: { channelId: string; userId: string; peerId: string }[] = [];
    for (const [socketId, peer] of peers) {
      state.push({
        channelId: peer.channelId,
        userId: peer.userId,
        peerId: socketId,
      });
    }
    socket.emit("voice:state-update", state);
  });

  // ── Chat ──────────────────────────────────────────────────────────────────
  socket.on(
    "message:send",
    (data: { text: string; senderId: string; senderName: string }) => {
      fastify.log.info(`Message from ${data.senderName}: ${data.text}`);
      io.emit("message:receive", { ...data, createdAt: Date.now() });
    }
  );

  // ── voice:join-channel ────────────────────────────────────────────────────
  socket.on(
    "voice:join-channel",
    async (
      data: { channelId: string; userId: string },
      ack: (res: object) => void
    ) => {
      try {
        const { channelId, userId } = data;
        const router = await voiceManager.getOrCreateRouter(channelId);

        const transportOptions = {
          listenIps: [{ ip: LISTEN_IP, announcedIp: undefined as string | undefined }],
          enableUdp: true,
          enableTcp: true,
        };

        const sendTransport = await router.createWebRtcTransport(transportOptions);
        const recvTransport = await router.createWebRtcTransport(transportOptions);

        peers.set(socket.id, {
          channelId,
          userId,
          sendTransport,
          recvTransport,
          producers: [],
          consumers: [],
        });

        await socket.join(`voice:${channelId}`);

        socket.to(`voice:${channelId}`).emit("voice:peer-joined", {
          peerId: socket.id,
          userId,
        });

        const existingPeers = Array.from(peers.entries())
          .filter(([sid, p]) => p.channelId === channelId && sid !== socket.id)
          .map(([sid, p]) => ({
            peerId: sid,
            userId: p.userId,
            producers: p.producers.map((prod) => ({ id: prod.id, kind: prod.kind })),
          }));

        ack({
          sendTransport: transportDto(sendTransport),
          recvTransport: transportDto(recvTransport),
          rtpCapabilities: router.rtpCapabilities,
          peers: existingPeers,
        });

        broadcastVoiceState();

        fastify.log.info(`[voice] ${userId} (${socket.id}) joined channel ${channelId}`);
      } catch (err) {
        fastify.log.error(err, "voice:join-channel error");
        ack({ error: String(err) });
      }
    }
  );

  // ── voice:connect-transport ───────────────────────────────────────────────
  socket.on(
    "voice:connect-transport",
    async (
      data: { transportId: string; dtlsParameters: any },
      ack: (res: object) => void
    ) => {
      try {
        const peer = peers.get(socket.id);
        if (!peer) throw new Error("Peer not found");

        const { transportId, dtlsParameters } = data;
        const transport =
          peer.sendTransport.id === transportId
            ? peer.sendTransport
            : peer.recvTransport.id === transportId
            ? peer.recvTransport
            : null;

        if (!transport) throw new Error(`Transport ${transportId} not found`);

        await transport.connect({ dtlsParameters });
        ack({ connected: true });
      } catch (err) {
        fastify.log.error(err, "voice:connect-transport error");
        ack({ error: String(err) });
      }
    }
  );

  // ── voice:produce ─────────────────────────────────────────────────────────
  socket.on(
    "voice:produce",
    async (
      data: { transportId: string; kind: string; rtpParameters: object },
      ack: (res: object) => void
    ) => {
      try {
        const peer = peers.get(socket.id);
        if (!peer) throw new Error("Peer not found");

        const { kind, rtpParameters } = data;

        if (kind !== "audio" && kind !== "video") {
          throw new Error(`Invalid kind: ${kind}`);
        }

        const producer = await peer.sendTransport.produce({
          kind,
          rtpParameters: rtpParameters as Parameters<typeof peer.sendTransport.produce>[0]["rtpParameters"],
        });

        peer.producers.push(producer);

        socket.to(`voice:${peer.channelId}`).emit("voice:new-producer", {
          producerId: producer.id,
          peerId: socket.id,
        });

        ack({ producerId: producer.id });
        fastify.log.info(`[voice] Producer created: ${producer.id} by ${socket.id}`);
      } catch (err) {
        fastify.log.error(err, "voice:produce error");
        ack({ error: String(err) });
      }
    }
  );

  // ── voice:consume ─────────────────────────────────────────────────────────
  socket.on(
    "voice:consume",
    async (
      data: { producerId: string; rtpCapabilities: object },
      ack: (res: object) => void
    ) => {
      try {
        const peer = peers.get(socket.id);
        if (!peer) throw new Error("Peer not found");

        const { producerId, rtpCapabilities } = data;

        let producer: Producer | undefined;
        for (const [, otherPeer] of peers) {
          producer = otherPeer.producers.find((p) => p.id === producerId);
          if (producer) break;
        }
        if (!producer) throw new Error(`Producer ${producerId} not found`);

        const router = await voiceManager.getOrCreateRouter(peer.channelId);

        if (
          !router.canConsume({
            producerId,
            rtpCapabilities: rtpCapabilities as Parameters<typeof router.canConsume>[0]["rtpCapabilities"],
          })
        ) {
          throw new Error("Router cannot consume this producer");
        }

        const consumer = await peer.recvTransport.consume({
          producerId,
          rtpCapabilities: rtpCapabilities as Parameters<typeof peer.recvTransport.consume>[0]["rtpCapabilities"],
          paused: false,
        });

        peer.consumers.push(consumer);

        ack({
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });

        fastify.log.info(`[voice] Consumer created: ${consumer.id} for producer ${producerId}`);
      } catch (err) {
        fastify.log.error(err, "voice:consume error");
        ack({ error: String(err) });
      }
    }
  );

  // ── voice:leave-channel ───────────────────────────────────────────────────
  socket.on("voice:leave-channel", async () => {
    const channelId = cleanupPeer(socket.id);
    if (channelId) {
      await socket.leave(`voice:${channelId}`);
      io.to(`voice:${channelId}`).emit("voice:peer-left", { peerId: socket.id });
      broadcastVoiceState();
    }
  });

  // ── voice:speaking ────────────────────────────────────────────────────────
  socket.on("voice:speaking", (data: { isSpeaking: boolean }) => {
    const peer = peers.get(socket.id);
    if (peer) {
      socket.to(`voice:${peer.channelId}`).emit("voice:speaking", {
        userId: peer.userId,
        isSpeaking: data.isSpeaking,
      });
    }
  });

  // ── DM Call signalling ────────────────────────────────────────────────────
  socket.on(
    "voice:call-request",
    (data: { targetUserId: string; callerId: string; callerName: string; dmThreadId: string }) => {
      const targetSocketId = userToSocket.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("voice:incoming-call", {
          callerId: data.callerId,
          callerName: data.callerName,
          callerSocketId: socket.id,
          dmThreadId: data.dmThreadId,
        });
        fastify.log.info(`[voice] Call request from ${data.callerName} (${socket.id}) forwarded to User ${data.targetUserId} (${targetSocketId})`);
      } else {
        fastify.log.warn(`[voice] Call request failed: User ${data.targetUserId} is offline`);
        socket.emit("voice:call-rejected");
      }
    }
  );

  socket.on(
    "voice:call-accept",
    (data: { callerSocketId: string; calleeId: string; calleeName: string }) => {
      io.to(data.callerSocketId).emit("voice:call-accepted", {
        calleeId: data.calleeId,
        calleeName: data.calleeName,
        calleeSocketId: socket.id,
      });
    }
  );

  socket.on("voice:call-reject", (data: { callerSocketId: string }) => {
    io.to(data.callerSocketId).emit("voice:call-rejected");
  });

  socket.on("voice:call-ended", (data: { otherSocketId: string }) => {
    io.to(data.otherSocketId).emit("voice:call-ended");
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on("disconnect", async () => {
    fastify.log.info(`Client disconnected: ${socket.id}`);
    const channelId = cleanupPeer(socket.id);
    if (channelId) {
      io.to(`voice:${channelId}`).emit("voice:peer-left", { peerId: socket.id });
      broadcastVoiceState();
    }
    const userDetails = socketToUser.get(socket.id);
    if (userDetails) {
      userToSocket.delete(userDetails.userId);
      socketToUser.delete(socket.id);
      onlineUsers.delete(userDetails.userId);
      io.emit("presence:update", { userId: userDetails.userId, online: false });
      fastify.log.info(`[voice] Removed registration for User ${userDetails.userId}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
process.on("SIGINT", async () => {
  io.close();
  await fastify.close();
  process.exit(0);
});
