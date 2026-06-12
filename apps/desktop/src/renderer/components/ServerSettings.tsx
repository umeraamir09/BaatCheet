import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "../hooks/useAppStore";
import { X, Shield, ShieldCheck, UserMinus, Crown, ArrowUp, ArrowDown, Link, Copy, Check, Trash2, Plus, Clock, Infinity as InfinityIcon } from "lucide-react";
import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";

type Tab = "members" | "invites";

export function ServerSettings() {
  const me = useQuery(api.users.getMe);
  const { activeServerId, showServerSettings, setShowServerSettings } = useAppStore();
  const servers = useQuery(api.servers.list);
  const activeServer = servers?.find((s) => s._id === activeServerId);
  const membersList = useQuery(api.servers.listMembers, activeServerId ? { serverId: activeServerId as Id<"servers"> } : "skip");
  const inviteLinks = useQuery(api.invites.list, activeServerId ? { serverId: activeServerId as Id<"servers"> } : "skip");

  const updateRole = useMutation(api.servers.updateRole);
  const kickMember = useMutation(api.servers.kick);
  const transferOwnership = useMutation(api.servers.transferOwnership);
  const generateInvite = useMutation(api.invites.generate);
  const revokeInvite = useMutation(api.invites.revoke);

  const [tab, setTab] = useState<Tab>("members");
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [maxUses, setMaxUses] = useState("");
  const [expiresIn, setExpiresIn] = useState("");

  if (!showServerSettings || !activeServerId || !me) return null;

  const myMembership = membersList?.find((m) => m.userId === me._id);
  const isOwner = myMembership?.role === "owner";
  const isAdmin = myMembership?.role === "admin" || isOwner;

  const handleUpdateRole = async (targetUserId: string, newRole: "admin" | "member") => {
    try {
      await updateRole({ serverId: activeServerId as Id<"servers">, targetUserId: targetUserId as Id<"users">, newRole });
    } catch (err: any) {
      alert(err.message);
    }
    setMenuUserId(null);
  };

  const handleKick = async (targetUserId: string) => {
    if (!confirm("Are you sure you want to kick this member?")) return;
    try {
      await kickMember({ serverId: activeServerId as Id<"servers">, targetUserId: targetUserId as Id<"users"> });
    } catch (err: any) {
      alert(err.message);
    }
    setMenuUserId(null);
  };

  const handleTransfer = async () => {
    if (!menuUserId) return;
    if (!confirm("Are you sure you want to transfer ownership? You will become an admin.")) return;
    try {
      await transferOwnership({ serverId: activeServerId as Id<"servers">, newOwnerId: menuUserId as Id<"users"> });
    } catch (err: any) {
      alert(err.message);
    }
    setMenuUserId(null);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <span className="text-yellow-400 text-xs flex items-center gap-1"><Crown size={12} /> Owner</span>;
      case "admin":
        return <span className="text-blue-400 text-xs flex items-center gap-1"><ShieldCheck size={12} /> Admin</span>;
      default:
        return <span className="text-gray-400 text-xs flex items-center gap-1"><Shield size={12} /> Member</span>;
    }
  };

  const handleGenerateInvite = async () => {
    if (!me || !activeServerId) return;
    try {
      const maxUsesNum = maxUses ? parseInt(maxUses) : undefined;
      let expiresAt: number | undefined;
      if (expiresIn) {
        const num = parseInt(expiresIn);
        if (!isNaN(num)) {
          expiresAt = Date.now() + num * 60 * 1000;
        }
      }
      await generateInvite({
        serverId: activeServerId as Id<"servers">,
        maxUses: maxUsesNum,
        expiresAt,
      });
      setShowGenerateForm(false);
      setMaxUses("");
      setExpiresIn("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRevokeInvite = async (inviteId: Id<"inviteLinks">) => {
    if (!me || !confirm("Revoke this invite link? It will no longer work.")) return;
    try {
      await revokeInvite({ inviteId });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatExpiry = (expiresAt?: number) => {
    if (!expiresAt) return <span className="flex items-center gap-1 text-xs text-green-400"><InfinityIcon size={12} /> Never</span>;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return <span className="text-xs text-red-400">Expired</span>;
    const mins = Math.floor(remaining / 60000);
    if (mins < 60) return <span className="text-xs text-yellow-400 flex items-center gap-1"><Clock size={12} /> {mins}m</span>;
    return <span className="text-xs text-yellow-400 flex items-center gap-1"><Clock size={12} /> {Math.floor(mins / 60)}h {mins % 60}m</span>;
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "members", label: "Members" },
    { key: "invites", label: "Invites" },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]">
      <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-2xl w-[560px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{activeServer?.name || "Server"} Settings</h2>
          <button onClick={() => setShowServerSettings(false)} className="text-[var(--color-text-muted)] hover:text-white p-1 rounded hover:bg-[var(--color-bg-tertiary)]">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-[var(--color-border)]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t.key
                  ? "bg-[var(--color-bg-tertiary)] text-white border border-[var(--color-border)] border-b-transparent"
                  : "text-[var(--color-text-secondary)] hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {tab === "members" && (
            <>
              <h3 className="text-xs uppercase tracking-wide font-bold text-[var(--color-text-secondary)] mb-3">
                Members — {membersList?.length || 0}
              </h3>
              <div className="space-y-1">
                {membersList?.map((m) => {
                  if (!m.user) return null;
                  const isMe = m.userId === me._id;
                  const isTargetOwner = m.role === "owner";

                  return (
                    <div key={m._id} className="relative flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors group">
                      {m.user.avatarUrl ? (
                        <img src={m.user.avatarUrl} alt={m.user.displayName} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                          {m.user.displayName?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="flex-1 flex flex-col">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {m.user.displayName} {isMe && <span className="text-xs text-[var(--color-text-muted)]">(You)</span>}
                        </span>
                        <span>{getRoleBadge(m.role)}</span>
                      </div>

                      {(isAdmin && !isMe && !isTargetOwner && (
                        <div className="relative">
                          <button
                            onClick={() => setMenuUserId(menuUserId === m.userId ? null : m.userId)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-white rounded transition-all"
                          >
                            <ArrowDown size={16} />
                          </button>
                          {menuUserId === m.userId && (
                            <div className="absolute right-0 top-8 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-xl py-1 min-w-[160px] z-30">
                              {isOwner && m.role === "member" && (
                                <button onClick={() => handleUpdateRole(m.userId, "admin")} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]">
                                  <ArrowUp size={14} /> Promote to Admin
                                </button>
                              )}
                              {isOwner && m.role === "admin" && (
                                <button onClick={() => handleUpdateRole(m.userId, "member")} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]">
                                  <ArrowDown size={14} /> Demote to Member
                                </button>
                              )}
                              {isOwner && (
                                <button onClick={handleTransfer} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-[var(--color-bg-tertiary)]">
                                  <Crown size={14} /> Transfer Ownership
                                </button>
                              )}
                              {(isOwner || (m.role !== "admin")) && (
                                <button onClick={() => handleKick(m.userId)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[var(--color-bg-tertiary)]">
                                  <UserMinus size={14} /> Kick
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )) || (
                        <div className="w-8" />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === "invites" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wide font-bold text-[var(--color-text-secondary)]">
                  Invite Links — {inviteLinks?.length || 0}
                </h3>
                {(isOwner || isAdmin) && (
                  <button
                    onClick={() => setShowGenerateForm(!showGenerateForm)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Plus size={14} /> Generate
                  </button>
                )}
              </div>

              {showGenerateForm && (
                <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Max Uses</label>
                      <input
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                        placeholder="Unlimited"
                        type="number"
                        min="1"
                        className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Expires (minutes)</label>
                      <input
                        value={expiresIn}
                        onChange={(e) => setExpiresIn(e.target.value)}
                        placeholder="Never"
                        type="number"
                        min="1"
                        className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowGenerateForm(false)} className="px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-white transition-colors">Cancel</button>
                    <button onClick={handleGenerateInvite} className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">Create Link</button>
                  </div>
                </div>
              )}

              {(!inviteLinks || inviteLinks.length === 0) && !showGenerateForm && (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-secondary)] gap-2">
                  <Link size={32} className="opacity-40" />
                  <p className="text-sm">No invite links yet</p>
                </div>
              )}

              <div className="space-y-2">
                {inviteLinks?.map((invite) => (
                  <div key={invite._id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-bold text-green-400">{invite.code}</code>
                        <button
                          onClick={() => handleCopyCode(invite.code)}
                          className="p-0.5 text-[var(--color-text-muted)] hover:text-white transition-colors"
                          title="Copy code"
                        >
                          {copiedCode === invite.code ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          Uses: {invite.uses}{invite.maxUses ? ` / ${invite.maxUses}` : ""}
                        </span>
                        {formatExpiry(invite.expiresAt)}
                      </div>
                    </div>
                    {(isOwner || isAdmin) && (
                      <button
                        onClick={() => handleRevokeInvite(invite._id as Id<"inviteLinks">)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all"
                        title="Revoke"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
