import { create } from "zustand";

// ─── App Navigation ───────────────────────────────────────────────────────────

interface AppState {
  view: "servers" | "dms" | "friends";
  activeServerId: string | null;
  activeChannelId: string | null;
  activeDmThreadId: string | null;
  setView: (view: "servers" | "dms" | "friends") => void;
  setActiveServerId: (id: string | null) => void;
  setActiveChannelId: (id: string | null) => void;
  setActiveDmThreadId: (id: string | null) => void;

  // Settings
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;

  // Server settings
  showServerSettings: boolean;
  setShowServerSettings: (show: boolean) => void;

  // Online users
  onlineUsers: Set<string>;
  setOnlineUsers: (users: Set<string>) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "servers",
  activeServerId: null,
  activeChannelId: null,
  activeDmThreadId: null,
  setView: (view) => set({ view }),
  setActiveServerId: (activeServerId) => set({ activeServerId }),
  setActiveChannelId: (activeChannelId) => set({ activeChannelId }),
  setActiveDmThreadId: (activeDmThreadId) => set({ activeDmThreadId }),

  showSettings: false,
  setShowSettings: (showSettings) => set({ showSettings }),

  showServerSettings: false,
  setShowServerSettings: (showServerSettings) => set({ showServerSettings }),

  onlineUsers: new Set<string>(),
  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),
  addOnlineUser: (userId) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      next.add(userId);
      return { onlineUsers: next };
    }),
  removeOnlineUser: (userId) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),
}));

// ─── Voice State ──────────────────────────────────────────────────────────────

export type VoiceStatus = "idle" | "connecting" | "connected";

export interface VoicePeer {
  peerId: string;
  userId: string;
  isMuted?: boolean;
}

export interface ActiveDMCall {
  otherSocketId: string;
  otherUserId: string;
  otherUserName: string;
  dmThreadId: string;
}

export interface IncomingCall {
  callerSocketId: string;
  callerId: string;
  callerName: string;
}

interface VoiceState {
  // Channel voice
  voiceChannelId: string | null;
  voiceStatus: VoiceStatus;
  voicePeers: VoicePeer[];
  isMuted: boolean;
  isDeafened: boolean;

  // Global voice state across all channels
  voiceState: { channelId: string; userId: string; peerId: string }[];
  // Speaking status indexed by userId
  speakingUsers: Record<string, boolean>;

  // DM calls
  activeDMCall: ActiveDMCall | null;
  incomingCall: IncomingCall | null;

  // Actions
  setVoiceChannel: (channelId: string | null) => void;
  setVoiceStatus: (status: VoiceStatus) => void;
  setVoicePeers: (peers: VoicePeer[]) => void;
  addVoicePeer: (peer: VoicePeer) => void;
  removeVoicePeer: (peerId: string) => void;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;

  setVoiceState: (voiceState: { channelId: string; userId: string; peerId: string }[]) => void;
  setSpeakingUser: (userId: string, isSpeaking: boolean) => void;
  clearSpeakingUsers: () => void;

  setActiveDMCall: (call: ActiveDMCall | null) => void;
  setIncomingCall: (call: IncomingCall | null) => void;
}

// ─── Audio Settings ───────────────────────────────────────────────────────────

export interface AudioSettings {
  inputDeviceId: string | null;
  outputDeviceId: string | null;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  muteShortcut: string;
  deafenShortcut: string;
}

function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem("baatcheet_audio_settings");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore parse errors */ }
  return {
    inputDeviceId: null,
    outputDeviceId: null,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    muteShortcut: "CommandOrControl+Shift+M",
    deafenShortcut: "CommandOrControl+Shift+D",
  };
}

function saveAudioSettings(settings: AudioSettings) {
  localStorage.setItem("baatcheet_audio_settings", JSON.stringify(settings));
}

interface AudioSettingsState {
  audioSettings: AudioSettings;
  updateAudioSettings: (partial: Partial<AudioSettings>) => void;
}

export const useAudioSettingsStore = create<AudioSettingsState>((set) => ({
  audioSettings: loadAudioSettings(),
  updateAudioSettings: (partial) =>
    set((s) => {
      const next = { ...s.audioSettings, ...partial };
      saveAudioSettings(next);
      return { audioSettings: next };
    }),
}));

export const useVoiceStore = create<VoiceState>((set) => ({
  voiceChannelId: null,
  voiceStatus: "idle",
  voicePeers: [],
  isMuted: false,
  isDeafened: false,
  voiceState: [],
  speakingUsers: {},
  activeDMCall: null,
  incomingCall: null,

  setVoiceChannel: (voiceChannelId) => set({ voiceChannelId }),
  setVoiceStatus: (voiceStatus) => set({ voiceStatus }),
  setVoicePeers: (voicePeers) => set({ voicePeers }),
  addVoicePeer: (peer) => set((s) => ({ voicePeers: [...s.voicePeers, peer] })),
  removeVoicePeer: (peerId) =>
    set((s) => ({ voicePeers: s.voicePeers.filter((p) => p.peerId !== peerId) })),
  setMuted: (isMuted) => set({ isMuted }),
  setDeafened: (isDeafened) => set({ isDeafened }),

  setVoiceState: (voiceState) => set({ voiceState }),
  setSpeakingUser: (userId, isSpeaking) =>
    set((s) => ({
      speakingUsers: { ...s.speakingUsers, [userId]: isSpeaking },
    })),
  clearSpeakingUsers: () => set({ speakingUsers: {} }),

  setActiveDMCall: (activeDMCall) => set({ activeDMCall }),
  setIncomingCall: (incomingCall) => set({ incomingCall }),
}));
