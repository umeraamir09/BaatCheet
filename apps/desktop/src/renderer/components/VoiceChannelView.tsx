import { Mic, MicOff, Headphones, PhoneOff, Volume2, Loader2 } from "lucide-react";
import { useVoice } from "../hooks/useVoice";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppStore, useVoiceStore } from "../hooks/useAppStore";
import type { Id } from "../../../convex/_generated/dataModel";

interface VoiceChannelViewProps {
  channelName: string;
}

export function VoiceChannelView({ channelName }: VoiceChannelViewProps) {
  const { voiceStatus, voicePeers, isMuted, isDeafened, toggleMute, toggleDeafen, leaveVoiceChannel } = useVoice();
  const { activeServerId } = useAppStore();

  const me = useQuery(api.users.getMe);
  const members = useQuery(api.servers.members, activeServerId ? { serverId: activeServerId as Id<"servers"> } : "skip");
  const speakingUsers = useVoiceStore((s) => s.speakingUsers);

  return (
    <div className="flex flex-col flex-1 bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-4 shadow-sm">
        <Volume2 size={18} className="text-[var(--color-text-muted)]" />
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{channelName}</h2>
        {voiceStatus === "connecting" && (
          <span className="ml-2 flex items-center gap-1 text-xs text-yellow-400">
            <Loader2 size={12} className="animate-spin" /> Connecting…
          </span>
        )}
      </div>

      {/* Participants */}
      <div className="flex-1 flex flex-col items-center justify-start gap-6 p-8">
        <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-4">
          {voicePeers.length + 1} in voice
        </p>

        <div className="flex flex-wrap items-center justify-center gap-8">
          {/* Myself */}
          {me && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                {me.imageUrl ? (
                  <img
                    src={me.imageUrl}
                    alt={me.name}
                    className={`w-16 h-16 rounded-full object-cover transition-all ${
                      speakingUsers[me._id]
                        ? "ring-4 ring-green-500 ring-offset-2 ring-offset-[var(--color-bg-primary)]"
                        : "ring-4 ring-transparent"
                    }`}
                  />
                ) : (
                  <div
                    className={`w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold transition-all ${
                      speakingUsers[me._id]
                        ? "ring-4 ring-green-500 ring-offset-2 ring-offset-[var(--color-bg-primary)]"
                        : "ring-4 ring-transparent"
                    }`}
                  >
                    {me.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                {isMuted && (
                  <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1 border border-[var(--color-bg-primary)] shadow">
                    <MicOff size={10} className="text-white" />
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {me.name} (You)
              </span>
            </div>
          )}

          {/* Remote peers */}
          {voicePeers.map((peer) => {
            const member = members?.find((m) => m._id === peer.userId);
            const isSpeaking = speakingUsers[peer.userId] || false;

            return (
              <div key={peer.peerId} className="flex flex-col items-center gap-2">
                <div className="relative">
                  {member?.imageUrl ? (
                    <img
                      src={member.imageUrl}
                      alt={member.name || "User"}
                      className={`w-16 h-16 rounded-full object-cover transition-all ${
                        isSpeaking
                          ? "ring-4 ring-green-500 ring-offset-2 ring-offset-[var(--color-bg-primary)]"
                          : "ring-4 ring-transparent"
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold transition-all ${
                        isSpeaking
                          ? "ring-4 ring-green-500 ring-offset-2 ring-offset-[var(--color-bg-primary)]"
                          : "ring-4 ring-transparent"
                      }`}
                    >
                      {member?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {member?.name || "Loading..."}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="shrink-0 flex items-center justify-center gap-4 p-6 border-t border-[var(--color-border)]">
        <button
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
          className={`p-3 rounded-full transition-all ${
            isMuted
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
          }`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          onClick={toggleDeafen}
          title={isDeafened ? "Undeafen" : "Deafen"}
          className={`p-3 rounded-full transition-all ${
            isDeafened
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
          }`}
        >
          <Headphones size={20} />
        </button>

        <button
          onClick={leaveVoiceChannel}
          title="Leave voice"
          className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}
