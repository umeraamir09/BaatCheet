import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Crown, ShieldCheck } from "lucide-react";

export function MembersSidebar({ serverId }: { serverId: Id<"servers"> }) {
  const membersList = useQuery(api.servers.listMembers, { serverId });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown size={12} className="text-yellow-400" />;
      case "admin": return <ShieldCheck size={12} className="text-blue-400" />;
      default: return null;
    }
  };

  return (
    <div className="w-60 bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] flex flex-col hidden md:flex">
      <div className="h-12 border-b border-[var(--color-border)] flex items-center px-4 font-semibold shadow-sm text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
        Members — {membersList?.length || 0}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {membersList?.map((m) => {
          if (!m.user) return null;
          return (
            <div key={m._id} className="flex items-center gap-3 p-2 hover:bg-[var(--color-bg-tertiary)] rounded-md transition-colors cursor-pointer">
              {m.user.avatarUrl ? (
                <img src={m.user.avatarUrl} alt={m.user.displayName ?? m.user.username} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                  {(m.user.displayName ?? m.user.username)?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-[var(--color-text-primary)] text-sm truncate flex items-center gap-1">
                  {m.user.displayName ?? m.user.username}
                  {getRoleIcon(m.role)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
