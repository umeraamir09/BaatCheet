import { useConvexAuth, useAuthToken } from "@convex-dev/auth/react";
import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
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
import { ProfileSetup } from "./components/ProfileSetup";

function App() {
  const { isAuthenticated } = useConvexAuth();
  const token = useAuthToken();
  const me = useQuery(api.users.getMe);
  const view = useAppStore((state) => state.view);
  const authReady = useRef(false);

  useEffect(() => {
    if (me && me.profileComplete && !authReady.current) {
      authReady.current = true;

      const initSocket = async () => {
        const socket = await connectWithAuth(token || "");

        const identify = () => {
          socket.emit("voice:identify", { userId: me._id, name: me.displayName ?? me.username });
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
  }, [me, token]);

  if (isAuthenticated && me && !me.profileComplete) {
    return <ProfileSetup />;
  }

  if (!me) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="text-[var(--color-text-secondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[var(--color-bg-primary)] overflow-hidden text-[var(--color-text-primary)]">
      <Sidebar />
      {view === "servers" ? <ChannelSidebar /> : view === "dms" ? <DMSidebar /> : null}
      {view === "friends" ? <FriendsView /> : <ChatWindow />}
      <IncomingCallBanner />
      <ActiveCallOverlay />
      <ServerSettings />
      <SettingsModal />
    </div>
  );
}

export default App;
