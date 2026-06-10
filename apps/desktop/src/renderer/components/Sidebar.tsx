import { UserButton } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "../hooks/useAppStore";
import { MessageSquare, Plus, UserCheck, Settings, LogIn, Loader2 } from "lucide-react";
import { useState } from "react";

export function Sidebar() {
  const me = useQuery(api.users.getMe);
  const servers = useQuery(api.servers.list);
  const createServer = useMutation(api.servers.create);
  const joinServer = useMutation(api.invites.join);

  const { view, activeServerId, setView, setActiveServerId, setShowSettings, setShowServerSettings } = useAppStore();
  const [isCreatingServer, setIsCreatingServer] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [isJoiningServer, setIsJoiningServer] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me || !newServerName.trim()) return;
    const serverId = await createServer({ name: newServerName.trim() });
    setActiveServerId(serverId);
    setView("servers");
    setIsCreatingServer(false);
    setNewServerName("");
  };

  return (
    <div className="w-[72px] bg-[var(--color-bg-tertiary)] flex flex-col items-center py-3 gap-3 overflow-y-auto custom-scrollbar border-r border-[var(--color-border)]">
      {/* DM Button */}
      <button
        onClick={() => {
          setView("dms");
          setActiveServerId(null);
        }}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
          view === "dms"
            ? "bg-blue-500 text-white rounded-2xl"
            : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-blue-500 hover:text-white hover:rounded-2xl"
        }`}
      >
        <MessageSquare size={24} />
      </button>

      {/* Friends Button */}
      <button
        onClick={() => {
          setView("friends");
          setActiveServerId(null);
        }}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
          view === "friends"
            ? "bg-green-500 text-white rounded-2xl"
            : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-green-500 hover:text-white hover:rounded-2xl"
        }`}
      >
        <UserCheck size={24} />
      </button>

      <div className="w-8 h-[2px] bg-[var(--color-border)] rounded-full my-1"></div>

      {/* Server List */}
      {servers?.map((server) => (
        <button
          key={server._id}
          onClick={() => {
            setView("servers");
            setActiveServerId(server._id);
          }}
          className={`relative w-12 h-12 flex items-center justify-center transition-all duration-200 group ${
            activeServerId === server._id
              ? "bg-blue-500 text-white rounded-2xl"
              : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] rounded-full hover:bg-blue-500 hover:text-white hover:rounded-2xl"
          }`}
        >
          {activeServerId === server._id && (
            <div className="absolute -left-3 w-1 h-10 bg-white rounded-r-full"></div>
          )}
          {server.imageUrl ? (
            <img src={server.imageUrl} alt={server.name} className="w-full h-full rounded-inherit object-cover" />
          ) : (
            <span className="font-semibold text-lg">{server.name.charAt(0).toUpperCase()}</span>
          )}
        </button>
      ))}

      {/* Add Server Button */}
      <button
        onClick={() => setIsCreatingServer(true)}
        className="w-12 h-12 rounded-full bg-[var(--color-bg-secondary)] text-green-500 flex items-center justify-center transition-all duration-200 hover:bg-green-500 hover:text-white hover:rounded-2xl"
        title="Create Server"
      >
        <Plus size={24} />
      </button>

      {/* Join Server Button */}
      <button
        onClick={() => { setIsJoiningServer(true); setJoinError(""); setInviteCode(""); }}
        className="w-12 h-12 rounded-full bg-[var(--color-bg-secondary)] text-blue-400 flex items-center justify-center transition-all duration-200 hover:bg-blue-500 hover:text-white hover:rounded-2xl"
        title="Join Server with invite code"
      >
        <LogIn size={20} />
      </button>

      {/* Create Server Modal */}
      {isCreatingServer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-bg-secondary)] p-6 rounded-lg shadow-xl w-80">
            <h3 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">Create your server</h3>
            <form onSubmit={handleCreateServer}>
              <input
                autoFocus
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder="Server Name"
                className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-3 py-2 text-[var(--color-text-primary)] mb-4 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreatingServer(false)} className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-white">Cancel</button>
                <button type="submit" disabled={!newServerName.trim()} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Server Modal */}
      {isJoiningServer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-bg-secondary)] p-6 rounded-lg shadow-xl w-80">
            <h3 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">Join a Server</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">Enter an invite code to join a server.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!me || !inviteCode.trim()) return;
              setJoinLoading(true);
              setJoinError("");
              try {
                const serverId = await joinServer({ code: inviteCode.trim() });
                setActiveServerId(serverId);
                setView("servers");
                setIsJoiningServer(false);
                setInviteCode("");
              } catch (err: any) {
                setJoinError(err.message);
              } finally {
                setJoinLoading(false);
              }
            }}>
              <input
                autoFocus
                value={inviteCode}
                onChange={(e) => { setInviteCode(e.target.value); setJoinError(""); }}
                placeholder="Enter invite code"
                className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-3 py-2 text-[var(--color-text-primary)] mb-2 outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono uppercase tracking-widest"
              />
              {joinError && <p className="text-xs text-red-400 mb-2">{joinError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsJoiningServer(false)} className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-white" disabled={joinLoading}>Cancel</button>
                <button type="submit" disabled={!inviteCode.trim() || joinLoading} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1">
                  {joinLoading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-auto pt-4 flex flex-col items-center gap-2">
        {/* Server Settings (only when on a server) */}
        {activeServerId && (
          <button
            onClick={() => setShowServerSettings(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-blue-500 hover:text-white transition-all duration-200"
            title="Server Settings"
          >
            <Settings size={18} />
          </button>
        )}

        {/* Settings */}
        <button
          onClick={() => setShowSettings(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-bg-secondary)] text-gray-400 hover:bg-gray-600 hover:text-white transition-all duration-200"
          title="User Settings"
        >
          <Settings size={16} />
        </button>

         <UserButton 
            appearance={{
              elements: {
                avatarBox: "w-12 h-12",
              },
            }}
          />
      </div>
    </div>
  );
}
