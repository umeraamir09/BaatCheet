import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "../hooks/useAppStore";

export function DMSidebar() {
  const dmThreads = useQuery(api.dms.list);
  
  // For simplicity in Phase 2, we list all users to start a DM
  // In a real app, this would be a search or friends list
  // I will add a small query for all users just for demo purposes if we need it,
  // but for now let's just show existing DMs.

  const { activeDmThreadId, setActiveDmThreadId } = useAppStore();

  return (
    <div className="w-60 bg-[var(--color-bg-secondary)] flex flex-col border-r border-[var(--color-border)]">
      <div className="h-12 border-b border-[var(--color-border)] flex items-center px-4 font-semibold shadow-sm text-lg">
        <span>Direct Messages</span>
      </div>
      <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
        <div className="space-y-[2px]">
          {dmThreads?.length === 0 && (
            <div className="text-sm text-[var(--color-text-secondary)] p-2">No direct messages yet.</div>
          )}
          {dmThreads?.map((thread) => {
            const otherUser = thread.otherUsers[0];
            return (
              <button
                key={thread._id}
                onClick={() => setActiveDmThreadId(thread._id)}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors ${
                  activeDmThreadId === thread._id
                    ? "bg-[var(--color-bg-tertiary)] text-white"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-white"
                }`}
              >
                {otherUser?.imageUrl ? (
                  <img src={otherUser.imageUrl} alt={otherUser.name} className="w-8 h-8 rounded-full bg-gray-600 object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    {otherUser?.name?.[0] || "?"}
                  </div>
                )}
                <span className="truncate font-medium">{otherUser?.name || "Unknown"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
