import mediasoup from "mediasoup";
import type {
  Worker,
  Router,
  RtpCodecCapability,
} from "mediasoup/types";

// ---------------------------------------------------------------------------
// RTP capabilities – audio-only (Opus)
// ---------------------------------------------------------------------------
const mediaCodecs: RtpCodecCapability[] = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
    preferredPayloadType: 111,
    parameters: {
      usedtx: 1,
      maxaveragebitrate: 32000,
      maxplaybackrate: 16000,
      stereo: 0,
      sprop_stereo: 0,
    },
  },
];

// ---------------------------------------------------------------------------
// VoiceManager – singleton that owns the mediasoup Worker and all Routers
// ---------------------------------------------------------------------------
class VoiceManager {
  private worker: Worker | null = null;
  private routers = new Map<string, Router>();

  async init(): Promise<void> {
    this.worker = await mediasoup.createWorker({
      logLevel: "warn",
      logTags: ["rtp", "srtp", "rtcp"],
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    });

    this.worker.on("died", (error: Error) => {
      console.error("[VoiceManager] mediasoup Worker died:", error);
      // In production you'd restart; for now just log.
    });

    console.log("[VoiceManager] mediasoup Worker created (pid %d)", this.worker.pid);
  }

  // Returns the Router for a channel, creating one if it doesn't exist yet.
  async getOrCreateRouter(channelId: string): Promise<Router> {
    const existing = this.routers.get(channelId);
    if (existing) return existing;

    if (!this.worker) throw new Error("VoiceManager not initialised");

    const router = await this.worker.createRouter({ mediaCodecs });
    this.routers.set(channelId, router);
    console.log("[VoiceManager] Router created for channel:", channelId);
    return router;
  }

  // Returns RTP capabilities for a channel's router (creates router if needed).
  async getRtpCapabilities(channelId: string) {
    const router = await this.getOrCreateRouter(channelId);
    return router.rtpCapabilities;
  }

  // Closes and removes the router for a channel.
  closeRoom(channelId: string): void {
    const router = this.routers.get(channelId);
    if (router) {
      router.close();
      this.routers.delete(channelId);
      console.log("[VoiceManager] Router closed for channel:", channelId);
    }
  }

  getWorker(): Worker | null {
    return this.worker;
  }
}

export const voiceManager = new VoiceManager();
