import { Phone, PhoneOff } from "lucide-react";
import { useVoice } from "../hooks/useVoice";
import { useVoiceStore } from "../hooks/useAppStore";

// ─── Incoming Call Banner ─────────────────────────────────────────────────────

export function IncomingCallBanner() {
  const { incomingCall, acceptCall, rejectCall } = useVoice();

  if (!incomingCall) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-2xl p-4 w-72 animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
          <Phone size={18} className="text-white animate-bounce" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Incoming Call</span>
          <span className="font-semibold text-[var(--color-text-primary)]">{incomingCall.callerName}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() =>
            acceptCall(
              incomingCall.callerSocketId,
              incomingCall.callerId,
              incomingCall.callerName,
              `dm:${incomingCall.callerSocketId}`,
              incomingCall.callerId
            )
          }
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
        >
          <Phone size={16} /> Accept
        </button>
        <button
          onClick={() => rejectCall(incomingCall.callerSocketId)}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
        >
          <PhoneOff size={16} /> Decline
        </button>
      </div>
    </div>
  );
}

// ─── Active DM Call Overlay ───────────────────────────────────────────────────

export function ActiveCallOverlay() {
  const { activeDMCall, isMuted, toggleMute, endCall } = useVoice();
  const voiceStatus = useVoiceStore((s) => s.voiceStatus);

  if (!activeDMCall) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[100] flex flex-col gap-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-2xl p-4 w-64">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${voiceStatus === "connected" ? "bg-green-500 animate-pulse" : "bg-yellow-400"}`} />
          <span className="text-xs text-[var(--color-text-muted)]">
            {voiceStatus === "connected" ? "In call with" : "Calling…"}
          </span>
        </div>
      </div>
      <span className="font-semibold text-[var(--color-text-primary)] text-sm">
        {activeDMCall.otherUserName || activeDMCall.otherUserId}
      </span>

      <div className="flex gap-2 mt-1">
        <button
          onClick={toggleMute}
          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            isMuted
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
          }`}
        >
          {isMuted ? "Unmute" : "Mute"}
        </button>
        <button
          onClick={endCall}
          className="flex items-center justify-center p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          title="End call"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );
}
