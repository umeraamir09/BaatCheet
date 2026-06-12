import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppStore, useVoiceStore } from "../hooks/useAppStore";
import { useVoice } from "../hooks/useVoice";
import { Hash, Plus, Volume2, Mic, MicOff, Headphones, PhoneOff, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";

export function ChannelSidebar() {
  const me = useQuery(api.users.getMe);
  
  const { activeServerId, activeChannelId, setActiveChannelId, setShowServerSettings } = useAppStore();
  const { voiceChannelId, voiceStatus, isMuted, isDeafened, toggleMute, toggleDeafen, leaveVoiceChannel, joinVoiceChannel } = useVoice();
  const channels = useQuery(api.channels.list, activeServerId ? { serverId: activeServerId as Id<"servers"> } : "skip");
  const servers = useQuery(api.servers.list);
  const members = useQuery(api.servers.members, activeServerId ? { serverId: activeServerId as Id<"servers"> } : "skip");

  const voiceState = useVoiceStore((s) => s.voiceState);
  const speakingUsers = useVoiceStore((s) => s.speakingUsers);
  
  const createChannel = useMutation(api.channels.create);

  const activeServer = servers?.find(s => s._id === activeServerId);
  const myMemberInfo = members?.find((m: any) => m._id === me?._id);
  const isOwner = activeServer?.ownerId === me?._id || (myMemberInfo as any)?.role === "owner";
  const isAdmin = isOwner || (myMemberInfo as any)?.role === "admin";

  useEffect(() => {
    if (channels && channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0]._id);
    }
  }, [channels, activeChannelId, setActiveChannelId]);

  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">("text");

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeServerId || !me || !newChannelName.trim()) return;
    try {
      const channelId = await createChannel({ 
        name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'), 
        serverId: activeServerId as Id<"servers">,
        type: newChannelType,
      });
      setActiveChannelId(channelId);
      setIsCreatingChannel(false);
      setNewChannelName("");
      setNewChannelType("text");
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!activeServerId) {
    return null;
  }

  const textChannels = channels?.filter(c => c.type === "text" || !c.type) || [];
  const voiceChannels = channels?.filter(c => c.type === "voice") || [];

  return (
    <div className="w-60 bg-[var(--color-bg-secondary)] flex flex-col border-r border-[var(--color-border)]">
      <div className="h-12 border-b border-[var(--color-border)] flex items-center justify-between px-4 font-semibold shadow-sm text-lg">
        <span className="truncate">{activeServer?.name || "Server"}</span>
        {(isOwner || members?.find(m => m._id === me?._id)?.role === "admin") && (
          <button
            onClick={() => setShowServerSettings(true)}
            className="p-1 text-[var(--color-text-muted)] hover:text-white rounded transition-colors"
            title="Server Settings"
          >
            <Settings size={16} />
          </button>
        )}
      </div>
      <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
        
        {/* TEXT CHANNELS */}
        <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text-secondary)] mb-2 uppercase tracking-wider group mt-2">
          <span>Text Channels</span>
          {(isOwner || isAdmin) && (
            <button onClick={() => { setNewChannelType("text"); setIsCreatingChannel(true); }} className="opacity-0 group-hover:opacity-100 hover:text-white transition-all">
              <Plus size={16} />
            </button>
          )}
        </div>
        <div className="space-y-[2px] mb-6">
          {textChannels.map((channel) => (
            <button
              key={channel._id}
              onClick={() => setActiveChannelId(channel._id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors font-medium ${
                activeChannelId === channel._id
                  ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-gray-200"
              }`}
            >
              <Hash size={18} className="opacity-70" />
              <span className="truncate">{channel.name}</span>
            </button>
          ))}
        </div>

        {/* VOICE CHANNELS */}
        <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text-secondary)] mb-2 uppercase tracking-wider group">
          <span>Voice Channels</span>
          {(isOwner || isAdmin) && (
            <button onClick={() => { setNewChannelType("voice"); setIsCreatingChannel(true); }} className="opacity-0 group-hover:opacity-100 hover:text-white transition-all">
              <Plus size={16} />
            </button>
          )}
        </div>
        <div className="space-y-[2px]">
          {voiceChannels.map((channel) => {
            const channelParticipants = voiceState.filter(p => p.channelId === channel._id);
            const isJoined = voiceChannelId === channel._id;

            return (
              <div key={channel._id} className="flex flex-col">
                <button
                  onClick={() => {
                    if (isJoined) {
                      leaveVoiceChannel();
                    } else {
                      joinVoiceChannel(channel._id, me?._id || "unknown");
                    }
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors font-medium ${
                    isJoined
                      ? "bg-green-500/20 text-green-400 font-semibold"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-gray-200"
                  }`}
                >
                  <Volume2 size={18} className="opacity-70" />
                  <span className="truncate">{channel.name}</span>
                  {isJoined && (
                    <span className="ml-auto text-[10px] text-green-400 font-semibold animate-pulse">LIVE</span>
                  )}
                </button>

                {/* Connected users list */}
                {channelParticipants.length > 0 && (
                  <div className="pl-6 pr-2 py-1 space-y-1.5 flex flex-col">
                    {channelParticipants.map((participant) => {
                      const member = members?.find((m) => m._id === participant.userId);
                      const isSpeaking = speakingUsers[participant.userId] || false;

                      return (
                        <div key={participant.userId} className="flex items-center gap-2 p-1 rounded hover:bg-[var(--color-bg-tertiary)]/50 transition-colors">
                          {member?.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.displayName}
                              className={`w-6 h-6 rounded-full object-cover transition-all ${
                                isSpeaking
                                  ? "ring-2 ring-green-500 ring-offset-1 ring-offset-[var(--color-bg-secondary)]"
                                  : ""
                              }`}
                            />
                          ) : (
                            <div
                              className={`w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold transition-all ${
                                isSpeaking
                                  ? "ring-2 ring-green-500 ring-offset-1 ring-offset-[var(--color-bg-secondary)]"
                                  : ""
                              }`}
                            >
                              {member?.displayName?.[0]?.toUpperCase() || "?"}
                            </div>
                          )}
                          <span className="text-sm text-[var(--color-text-primary)] truncate font-medium">
                            {member?.displayName || "Loading..."}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {voiceChannels.length === 0 && (
            <div className="px-2 text-xs text-[var(--color-text-muted)] italic">No voice channels</div>
          )}
        </div>

      </div>

      {/* In-Voice Status Bar */}
      {voiceChannelId && (
        <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-green-400">
                {voiceStatus === "connecting" ? "Connecting…" : "Voice Connected"}
              </span>
            </div>
            <button
              onClick={leaveVoiceChannel}
              title="Disconnect"
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <PhoneOff size={14} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
              className={`p-1.5 rounded transition-colors ${
                isMuted ? "bg-red-500/20 text-red-400" : "text-[var(--color-text-muted)] hover:text-white"
              }`}
            >
              {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
            <button
              onClick={toggleDeafen}
              title={isDeafened ? "Undeafen" : "Deafen"}
              className={`p-1.5 rounded transition-colors ${
                isDeafened ? "bg-red-500/20 text-red-400" : "text-[var(--color-text-muted)] hover:text-white"
              }`}
            >
              <Headphones size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {isCreatingChannel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-bg-secondary)] p-6 rounded-lg shadow-xl w-80">
            <h3 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">Create Channel</h3>
            <form onSubmit={handleCreateChannel}>
              <div className="flex flex-col gap-2 mb-4">
                <label className="text-xs uppercase font-bold text-[var(--color-text-secondary)]">Channel Type</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setNewChannelType("text")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border ${newChannelType === "text" ? "bg-[var(--color-bg-tertiary)] border-blue-500 text-white" : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"}`}
                  >
                    <Hash size={16} /> Text
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewChannelType("voice")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border ${newChannelType === "voice" ? "bg-[var(--color-bg-tertiary)] border-blue-500 text-white" : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"}`}
                  >
                    <Volume2 size={16} /> Voice
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 mb-6">
                <label className="text-xs uppercase font-bold text-[var(--color-text-secondary)]">Channel Name</label>
                <input
                  autoFocus
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="new-channel"
                  className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-3 py-2 text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreatingChannel(false)} className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-white">Cancel</button>
                <button type="submit" disabled={!newChannelName.trim()} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
