import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "../hooks/useAppStore";
import { UserPlus, UserCheck, UserX, Clock, MessageCircle, X, Loader2 } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

type Tab = "online" | "all" | "pending" | "add";

export function FriendsView() {
  const me = useQuery(api.users.getMe);
  const { onlineUsers } = useAppStore();

  const friendsList = useQuery(api.friends.list);
  const sendRequest = useMutation(api.friends.sendRequest);
  const respondRequest = useMutation(api.friends.respondRequest);
  const cancelRequest = useMutation(api.friends.cancelRequest);
  const removeFriend = useMutation(api.friends.removeFriend);
  const createOrGetDM = useMutation(api.dms.createOrGet);

  const { setActiveDmThreadId, setView } = useAppStore();

  const [tab, setTab] = useState<Tab>("online");
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [searchError, setSearchError] = useState("");

  if (!me) return null;

  const acceptedFriends = friendsList?.filter((f) => f.status === "accepted") || [];
  const pendingIncoming = friendsList?.filter((f) => f.status === "pending" && f.isIncoming) || [];
  const pendingOutgoing = friendsList?.filter((f) => f.status === "pending" && !f.isIncoming) || [];

  const onlineFriends = acceptedFriends.filter((f) => onlineUsers.has(f.friend?._id || ""));

  const handleSendRequest = async () => {
    if (!searchQuery.trim() || !me) return;
    setSendingTo(searchQuery);
    setSearchError("");
    try {
      await sendRequest({ username: searchQuery.trim() });
      setSearchQuery("");
    } catch (err: any) {
      setSearchError(err.message);
    }
    setSendingTo(null);
  };

  const handleStartDM = async (friendUserId: string) => {
    try {
      const threadId = await createOrGetDM({ otherUserId: friendUserId as Id<"users"> });
      setActiveDmThreadId(threadId);
      setView("dms");
    } catch (err) {
      console.error("Failed to create DM:", err);
    }
  };

  const renderFriendCard = (f: any) => {
    if (!f.friend) return null;
    const isOnline = onlineUsers.has(f.friend._id);

    return (
      <div key={f._id} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors group">
        <div className="relative">
          {f.friend.avatarUrl ? (
            <img src={f.friend.avatarUrl} alt={f.friend.displayName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              {f.friend.displayName?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--color-bg-secondary)] ${isOnline ? "bg-green-500" : "bg-gray-500"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{f.friend.displayName}</span>
          <span className={`text-xs ml-2 ${isOnline ? "text-green-400" : "text-gray-500"}`}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleStartDM(f.friend._id)}
            className="p-2 text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-tertiary)] rounded"
            title="Send message"
          >
            <MessageCircle size={16} />
          </button>
          <button
            onClick={() => removeFriend({ friendId: f._id })}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
            title="Remove friend"
          >
            <UserX size={16} />
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (tab) {
      case "online":
        return onlineFriends.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)] gap-2">
            <UserCheck size={40} className="opacity-40" />
            <p className="text-sm">No friends online</p>
          </div>
        ) : (
          <div className="space-y-1">{onlineFriends.map(renderFriendCard)}</div>
        );

      case "all":
        return acceptedFriends.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)] gap-2">
            <UserCheck size={40} className="opacity-40" />
            <p className="text-sm">No friends yet</p>
          </div>
        ) : (
          <div className="space-y-1">{acceptedFriends.map(renderFriendCard)}</div>
        );

      case "pending":
        return (
          <div className="space-y-4">
            {pendingIncoming.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-wide font-bold text-[var(--color-text-secondary)] mb-2">Incoming Requests</h4>
                {pendingIncoming.map((f) => (
                  <div key={f._id} className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[var(--color-bg-tertiary)]">
                    {f.friend?.avatarUrl ? (
                      <img src={f.friend.avatarUrl} alt={f.friend?.displayName} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">{f.friend?.displayName?.[0] || "?"}</div>
                    )}
                    <span className="flex-1 text-sm text-[var(--color-text-primary)]">{f.friend?.displayName || "Unknown"}</span>
                    <div className="flex gap-1">
                      <button onClick={() => respondRequest({ friendId: f._id, action: "accept" })} className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors">Accept</button>
                      <button onClick={() => respondRequest({ friendId: f._id, action: "decline" })} className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {pendingOutgoing.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-wide font-bold text-[var(--color-text-secondary)] mb-2">Outgoing Requests</h4>
                {pendingOutgoing.map((f) => (
                  <div key={f._id} className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[var(--color-bg-tertiary)]">
                    {f.friend?.avatarUrl ? (
                      <img src={f.friend.avatarUrl} alt={f.friend?.displayName} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">{f.friend?.displayName?.[0] || "?"}</div>
                    )}
                    <span className="flex-1 text-sm text-[var(--color-text-primary)]">{f.friend?.displayName || "Unknown"}</span>
                    <span className="text-xs text-yellow-400 flex items-center gap-1"><Clock size={12} /> Pending</span>
                    <button onClick={() => cancelRequest({ friendId: f._id })} className="p-1 text-[var(--color-text-muted)] hover:text-red-400 rounded"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            {pendingIncoming.length === 0 && pendingOutgoing.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)] gap-2">
                <Clock size={40} className="opacity-40" />
                <p className="text-sm">No pending requests</p>
              </div>
            )}
          </div>
        );

      case "add":
        return (
          <div className="flex flex-col items-center gap-4 pt-8">
            <UserPlus size={48} className="text-[var(--color-text-muted)] opacity-40" />
            <p className="text-sm text-[var(--color-text-secondary)]">Add friends by their username</p>
            <div className="flex gap-2 w-full max-w-sm">
              <input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendRequest(); }}
                placeholder="Enter a username..."
                className="flex-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendRequest}
                disabled={!searchQuery.trim() || sendingTo !== null}
                className="px-4 py-2 bg-blue-500 text-white rounded text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                {sendingTo ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Send Request
              </button>
            </div>
            {searchError && <p className="text-xs text-red-400">{searchError}</p>}
          </div>
        );
    }
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "online", label: "Online", count: onlineFriends.length },
    { key: "all", label: "All", count: acceptedFriends.length },
    { key: "pending", label: "Pending", count: pendingIncoming.length + pendingOutgoing.length },
    { key: "add", label: "Add Friend" },
  ];

  return (
    <div className="flex flex-col flex-1 bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center border-b border-[var(--color-border)] px-4 shadow-sm">
        <div className="flex items-center gap-2 mr-6">
          <UserCheck size={18} className="text-green-400" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Friends</h2>
        </div>
        <div className="flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
                tab === t.key
                  ? "bg-[var(--color-bg-tertiary)] text-white"
                  : "text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-bg-tertiary)]/50"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1.5 text-xs bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded-full">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {renderContent()}
      </div>
    </div>
  );
}
