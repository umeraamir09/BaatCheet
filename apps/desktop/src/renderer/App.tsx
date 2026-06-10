import { useUser, useAuth } from "@clerk/clerk-react";
import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAppStore } from "./hooks/useAppStore";
import { Sidebar } from "./components/Sidebar";
import { ChannelSidebar } from "./components/ChannelSidebar";
import { DMSidebar } from "./components/DMSidebar";
import { ChatWindow } from "./components/ChatWindow";
import { IncomingCallBanner, ActiveCallOverlay } from "./components/VoiceCallUI";
import { FriendsView } from "./components/FriendsView";
import { ServerSettings } from "./components/ServerSettings";
import { SettingsModal } from "./components/settings/SettingsModal";
import { connectWithAuth } from "./hooks/useVoice";

function App() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const syncUser = useMutation(api.users.sync);
  const me = useQuery(api.users.getMe);
  const view = useAppStore((state) => state.view);
  const authReady = useRef(false);

  useEffect(() => {
    if (user) {
      syncUser({
        clerkId: user.id,
        name: user.username || user.firstName || "Unknown",
        email: user.primaryEmailAddress?.emailAddress || "",
        imageUrl: user.imageUrl,
      });
    }
  }, [user, syncUser]);

  useEffect(() => {
    if (me && !authReady.current) {
      authReady.current = true;

      const initSocket = async () => {
        const token = await getToken();
        const socket = await connectWithAuth(token || "");

        const identify = () => {
          socket.emit("voice:identify", { userId: me._id, name: me.name });
        };

        identify();
        socket.on("connect", identify);

        return () => {
          socket.off("connect", identify);
        };
      };

      const cleanupPromise = initSocket();

      return () => {
        cleanupPromise.then((cleanup) => cleanup?.());
        authReady.current = false;
      };
    }
  }, [me, getToken]);

  return (
    <div className="flex h-screen w-full bg-[var(--color-bg-primary)] overflow-hidden text-[var(--color-text-primary)]">
      <Sidebar />
      {view === "servers" ? <ChannelSidebar /> : view === "dms" ? <DMSidebar /> : null}
      {view === "friends" ? <FriendsView /> : <ChatWindow />}
      {/* Global Voice Call Overlays */}
      <IncomingCallBanner />
      <ActiveCallOverlay />
      {/* Modals */}
      <ServerSettings />
      <SettingsModal />
    </div>
  );
}

export default App;

