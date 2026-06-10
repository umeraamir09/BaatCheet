import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Device } from "mediasoup-client";
import type { Transport, Producer, Consumer } from "mediasoup-client/lib/types.js";
import { useVoiceStore, useAudioSettingsStore } from "./useAppStore";
import { useAppStore } from "./useAppStore";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

// Singleton socket shared across the app
let _socket: Socket | null = null;
let _socketReadyListeners: Array<() => void> = [];

function notifySocketReady() {
  _socketReadyListeners.forEach(fn => fn());
  _socketReadyListeners = [];
}

export function getSocket(): Socket {
  if (!_socket) {
    throw new Error("Socket not initialized. Call connectWithAuth first.");
  }
  return _socket;
}

export function onSocketReady(cb: () => void): () => void {
  if (_socket) {
    cb();
    return () => {};
  }
  _socketReadyListeners.push(cb);
  return () => {
    _socketReadyListeners = _socketReadyListeners.filter(fn => fn !== cb);
  };
}

export async function connectWithAuth(token: string): Promise<Socket> {
  if (_socket?.connected) {
    _socket.disconnect();
  }
  _socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: Infinity,
    randomizationFactor: 0.5,
    auth: { token },
  });
  notifySocketReady();
  return _socket;
}

export function getAudioConstraints() {
  const settings = useAudioSettingsStore.getState().audioSettings;
  return {
    audio: {
      deviceId: settings.inputDeviceId ? { exact: settings.inputDeviceId } : undefined,
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression,
      autoGainControl: settings.autoGainControl,
    },
  };
}

export async function updateAudioStream(session: VoiceSession | null) {
  if (!session?.sendTransport) return;
  try {
    const constraints = getAudioConstraints();
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const newTrack = stream.getAudioTracks()[0];

    if (session.producer) {
      await session.producer.replaceTrack({ track: newTrack });
    }

    // Update audio context
    if (session.audioContext) {
      session.audioContext.close().catch(() => {});
    }
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const mediaStreamSource = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    mediaStreamSource.connect(analyser);
    session.audioContext = audioContext;
    session.analyser = analyser;

    return stream;
  } catch (err) {
    console.error("Failed to update audio stream:", err);
  }
}

export function setAudioSinkId(audioElement: HTMLAudioElement, deviceId: string) {
  if (typeof (audioElement as any).setSinkId === "function") {
    (audioElement as any).setSinkId(deviceId).catch(console.error);
  }
}

// ─── Voice Hook ───────────────────────────────────────────────────────────────

interface VoiceSession {
  device: Device;
  sendTransport: Transport;
  recvTransport: Transport;
  producer: Producer | null;
  consumers: Map<string, Consumer>;
  audioElements: Map<string, HTMLAudioElement>;
  audioContext?: AudioContext;
  analyser?: AnalyserNode;
  animationFrameId?: number;
}

let voiceSession: VoiceSession | null = null;

export function useVoice() {
  const {
    voiceChannelId,
    voiceStatus,
    voicePeers,
    isMuted,
    isDeafened,
    setVoiceChannel,
    setVoiceStatus,
    setVoicePeers,
    addVoicePeer,
    removeVoicePeer,
    setMuted,
    setDeafened,
    activeDMCall,
    incomingCall,
    setActiveDMCall,
    setIncomingCall,
  } = useVoiceStore();

  const sessionRef = useRef<VoiceSession | null>(voiceSession);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const consumeProducer = useCallback(
    async (producerId: string, peerId: string) => {
      const socket = getSocket();
      const session = sessionRef.current;
      if (!session) return;

      try {
        const consumerParams: any = await new Promise((resolve, reject) => {
          socket.emit(
            "voice:consume",
            {
              producerId,
              rtpCapabilities: session.device.rtpCapabilities,
            },
            (res: any) => {
              if (res?.error) reject(new Error(res.error));
              else resolve(res);
            }
          );
        });

        const consumer = await session.recvTransport.consume({
          id: consumerParams.id,
          producerId: consumerParams.producerId,
          kind: consumerParams.kind,
          rtpParameters: consumerParams.rtpParameters,
        });

        session.consumers.set(consumer.id, consumer);

        // Play audio
        const track = consumer.track;
        const stream = new MediaStream([track]);
        const audioEl = new Audio();
        audioEl.srcObject = stream;
        audioEl.autoplay = true;
        if (isDeafened) audioEl.volume = 0;
        
        // Route to selected output device
        const outputDeviceId = useAudioSettingsStore.getState().audioSettings.outputDeviceId;
        if (outputDeviceId) {
          setAudioSinkId(audioEl, outputDeviceId);
        }
        
        session.audioElements.set(peerId, audioEl);
        audioEl.play().catch(() => {});
      } catch (err) {
        console.error("Failed to consume producer:", err);
      }
    },
    [isDeafened]
  );

  // ── Join voice channel ────────────────────────────────────────────────────

  const joinVoiceChannel = useCallback(
    async (channelId: string, userId: string) => {
      const socket = getSocket();
      setVoiceStatus("connecting");
      setVoiceChannel(channelId);
      setVoicePeers([]);

      try {
        // Get router RTP capabilities + transports from server
        const joinData: any = await new Promise((resolve, reject) => {
          socket.emit(
            "voice:join-channel",
            { channelId, userId },
            (res: any) => {
              if (res?.error) reject(new Error(res.error));
              else resolve(res);
            }
          );
        });

        // Load mediasoup device
        const device = new Device();
        await device.load({ routerRtpCapabilities: joinData.rtpCapabilities });

        // Create send transport
        const sendTransport = device.createSendTransport(joinData.sendTransport);
        sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
          socket.emit(
            "voice:connect-transport",
            { transportId: sendTransport.id, dtlsParameters },
            (res: any) => {
              if (res?.error) errback(new Error(res.error));
              else callback();
            }
          );
        });
        sendTransport.on("produce", async ({ kind, rtpParameters }, callback, errback) => {
          socket.emit(
            "voice:produce",
            { transportId: sendTransport.id, kind, rtpParameters },
            (res: any) => {
              if (res?.error) errback(new Error(res.error));
              else callback({ id: res.producerId });
            }
          );
        });

        // Create recv transport
        const recvTransport = device.createRecvTransport(joinData.recvTransport);
        recvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
          socket.emit(
            "voice:connect-transport",
            { transportId: recvTransport.id, dtlsParameters },
            (res: any) => {
              if (res?.error) errback(new Error(res.error));
              else callback();
            }
          );
        });

        // Produce local audio with constraints
        const constraints = getAudioConstraints();
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const audioTrack = stream.getAudioTracks()[0];
        const producer = await sendTransport.produce({ track: audioTrack });

        // Set up local speaking/voice activity detection
        let audioContext: AudioContext | undefined;
        let analyser: AnalyserNode | undefined;
        let animationFrameId: number | undefined;

        try {
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const mediaStreamSource = audioContext.createMediaStreamSource(stream);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 512;
          mediaStreamSource.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let speaking = false;
          let lastSpeakingTime = 0;

          const checkVolume = () => {
            if (!sessionRef.current || !analyser) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            
            const currentMuted = useVoiceStore.getState().isMuted;
            const isLoud = !currentMuted && average > 15;

            const now = Date.now();
            if (isLoud) {
              lastSpeakingTime = now;
              if (!speaking) {
                speaking = true;
                socket.emit("voice:speaking", { isSpeaking: true });
                useVoiceStore.getState().setSpeakingUser(userId, true);
              }
            } else {
              if (speaking && now - lastSpeakingTime > 400) {
                speaking = false;
                socket.emit("voice:speaking", { isSpeaking: false });
                useVoiceStore.getState().setSpeakingUser(userId, false);
              }
            }

            if (sessionRef.current) {
              animationFrameId = requestAnimationFrame(checkVolume);
              sessionRef.current.animationFrameId = animationFrameId;
            }
          };

          animationFrameId = requestAnimationFrame(checkVolume);
        } catch (err) {
          console.error("Failed to set up voice activity detection:", err);
        }

        const session: VoiceSession = {
          device,
          sendTransport,
          recvTransport,
          producer,
          consumers: new Map(),
          audioElements: new Map(),
          audioContext,
          analyser,
          animationFrameId,
        };
        voiceSession = session;
        sessionRef.current = session;

        // Populate existing voice channel peers
        const peersList = (joinData.peers || []).map((p: any) => ({
          peerId: p.peerId,
          userId: p.userId,
        }));
        setVoicePeers(peersList);

        // Auto-consume all existing audio producers
        if (joinData.peers) {
          for (const peer of joinData.peers) {
            if (peer.producers) {
              for (const prod of peer.producers) {
                consumeProducer(prod.id, peer.peerId);
              }
            }
          }
        }

        setVoiceStatus("connected");
      } catch (err) {
        console.error("Failed to join voice channel:", err);
        setVoiceStatus("idle");
        setVoiceChannel(null);
      }
    },
    [setVoiceChannel, setVoiceStatus, setVoicePeers]
  );

  // ── Leave voice channel ───────────────────────────────────────────────────

  const leaveVoiceChannel = useCallback(() => {
    const socket = getSocket();
    const session = sessionRef.current;

    if (session) {
      session.producer?.close();
      session.consumers.forEach((c) => c.close());
      session.audioElements.forEach((el) => {
        el.pause();
        el.srcObject = null;
      });
      session.sendTransport.close();
      session.recvTransport.close();
      if (session.audioContext) {
        session.audioContext.close().catch(() => {});
      }
      if (session.animationFrameId) {
        cancelAnimationFrame(session.animationFrameId);
      }
      voiceSession = null;
      sessionRef.current = null;
    }

    socket.emit("voice:leave-channel");
    setVoiceChannel(null);
    setVoiceStatus("idle");
    setVoicePeers([]);
    setMuted(false);
    setDeafened(false);
    useVoiceStore.getState().clearSpeakingUsers();
  }, [setVoiceChannel, setVoiceStatus, setVoicePeers, setMuted, setDeafened]);

  // ── Mute / Deafen ─────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    const session = sessionRef.current;
    if (!session?.producer) return;
    if (isMuted) {
      session.producer.resume();
      setMuted(false);
    } else {
      session.producer.pause();
      setMuted(true);
    }
  }, [isMuted, setMuted]);

  const toggleDeafen = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    const next = !isDeafened;
    session.audioElements.forEach((el) => {
      el.volume = next ? 0 : 1;
    });
    setDeafened(next);
  }, [isDeafened, setDeafened]);

  // ── DM Call Controls ──────────────────────────────────────────────────────

  const requestCall = useCallback(
    (targetUserId: string, callerId: string, callerName: string, dmThreadId: string, otherUserName: string) => {
      const socket = getSocket();
      socket.emit("voice:call-request", { targetUserId, callerId, callerName, dmThreadId });
      setActiveDMCall({
        otherSocketId: "",
        otherUserId: targetUserId,
        otherUserName,
        dmThreadId,
      });
    },
    [setActiveDMCall]
  );

  const acceptCall = useCallback(
    (callerSocketId: string, calleeId: string, calleeName: string, dmThreadId: string, callerUserId: string) => {
      const socket = getSocket();
      socket.emit("voice:call-accept", { callerSocketId, calleeId, calleeName });
      setIncomingCall(null);

      const dmChannelId = `dm:${[socket.id, callerSocketId].sort().join(":")}`;
      setActiveDMCall({
        otherSocketId: callerSocketId,
        otherUserId: callerUserId,
        otherUserName: calleeName,
        dmThreadId: dmChannelId,
      });

      joinVoiceChannel(dmChannelId, callerUserId);
    },
    [setActiveDMCall, setIncomingCall, joinVoiceChannel]
  );

  const rejectCall = useCallback(
    (callerSocketId: string) => {
      const socket = getSocket();
      socket.emit("voice:call-reject", { callerSocketId });
      setIncomingCall(null);
    },
    [setIncomingCall]
  );

  const endCall = useCallback(() => {
    const socket = getSocket();
    if (activeDMCall) {
      socket.emit("voice:call-ended", { otherSocketId: activeDMCall.otherSocketId });
    }
    leaveVoiceChannel();
    setActiveDMCall(null);
  }, [activeDMCall, leaveVoiceChannel, setActiveDMCall]);

  // ── Socket event listeners (mount once) ───────────────────────────────────

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const registerListeners = () => {
      const socket = getSocket();

      const onPeerJoined = ({ peerId, userId }: { peerId: string; userId: string }) => {
        addVoicePeer({ peerId, userId });
      };

      const onNewProducer = ({ producerId, peerId }: { producerId: string; peerId: string }) => {
        consumeProducer(producerId, peerId);
      };

      const onPeerLeft = ({ peerId }: { peerId: string }) => {
        const session = sessionRef.current;
        if (session?.audioElements.has(peerId)) {
          const el = session.audioElements.get(peerId)!;
          el.pause();
          el.srcObject = null;
          session.audioElements.delete(peerId);
        }
        removeVoicePeer(peerId);
      };

      const onIncomingCall = ({
        callerId,
        callerName,
        callerSocketId,
      }: {
        callerId: string;
        callerName: string;
        callerSocketId: string;
      }) => {
        setIncomingCall({ callerId, callerName, callerSocketId });
      };

      const onCallAccepted = ({
        calleeSocketId,
        calleeId,
        calleeName,
      }: {
        calleeSocketId: string;
        calleeId: string;
        calleeName: string;
      }) => {
        const dmChannelId = `dm:${[socket.id, calleeSocketId].sort().join(":")}`;
        setActiveDMCall({ otherSocketId: calleeSocketId, otherUserId: calleeId, otherUserName: calleeName, dmThreadId: dmChannelId });
        joinVoiceChannel(dmChannelId, calleeId);
      };

      const onCallRejected = () => {
        setActiveDMCall(null);
      };

      const onCallEnded = () => {
        leaveVoiceChannel();
        setActiveDMCall(null);
      };

      const onSpeaking = ({ userId, isSpeaking }: { userId: string; isSpeaking: boolean }) => {
        useVoiceStore.getState().setSpeakingUser(userId, isSpeaking);
      };

      const onVoiceStateUpdate = (state: any) => {
        useVoiceStore.getState().setVoiceState(state);
      };

      const onPresenceUpdate = ({ userId, online }: { userId: string; online: boolean }) => {
        if (online) {
          useAppStore.getState().addOnlineUser(userId);
        } else {
          useAppStore.getState().removeOnlineUser(userId);
        }
      };

      socket.on("voice:peer-joined", onPeerJoined);
      socket.on("voice:new-producer", onNewProducer);
      socket.on("voice:peer-left", onPeerLeft);
      socket.on("voice:incoming-call", onIncomingCall);
      socket.on("voice:call-accepted", onCallAccepted);
      socket.on("voice:call-rejected", onCallRejected);
      socket.on("voice:call-ended", onCallEnded);
      socket.on("voice:speaking", onSpeaking);
      socket.on("voice:state-update", onVoiceStateUpdate);
      socket.on("presence:update", onPresenceUpdate);

      cleanup = () => {
        socket.off("voice:peer-joined", onPeerJoined);
        socket.off("voice:new-producer", onNewProducer);
        socket.off("voice:peer-left", onPeerLeft);
        socket.off("voice:incoming-call", onIncomingCall);
        socket.off("voice:call-accepted", onCallAccepted);
        socket.off("voice:call-rejected", onCallRejected);
        socket.off("voice:call-ended", onCallEnded);
        socket.off("voice:speaking", onSpeaking);
        socket.off("voice:state-update", onVoiceStateUpdate);
        socket.off("presence:update", onPresenceUpdate);
      };
    };

    const unsub = onSocketReady(registerListeners);

    // Register IPC shortcut listener (Electron)
    const onShortcutTriggered = (action: string) => {
      if (action === "toggle-mute") {
        useVoiceStore.getState().setMuted(!useVoiceStore.getState().isMuted);
        const session = sessionRef.current;
        if (session?.producer) {
          if (useVoiceStore.getState().isMuted) {
            session.producer.resume();
          } else {
            session.producer.pause();
          }
        }
      } else if (action === "toggle-deafen") {
        const next = !useVoiceStore.getState().isDeafened;
        useVoiceStore.getState().setDeafened(next);
        const session = sessionRef.current;
        if (session) {
          session.audioElements.forEach((el) => {
            el.volume = next ? 0 : 1;
          });
        }
      }
    };

    if ((window as any).electronAPI?.on) {
      (window as any).electronAPI.on("shortcut:triggered", onShortcutTriggered);
    }

    return () => {
      cleanup?.();
      unsub();
      if ((window as any).electronAPI?.off) {
        (window as any).electronAPI.off("shortcut:triggered", onShortcutTriggered);
      }
    };
  }, [addVoicePeer, removeVoicePeer, consumeProducer, setIncomingCall, setActiveDMCall, joinVoiceChannel, leaveVoiceChannel]);

  return {
    // State
    voiceChannelId,
    voiceStatus,
    voicePeers,
    isMuted,
    isDeafened,
    activeDMCall,
    incomingCall,
    // Actions
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
    requestCall,
    acceptCall,
    rejectCall,
    endCall,
    getSocket,
  };
}
