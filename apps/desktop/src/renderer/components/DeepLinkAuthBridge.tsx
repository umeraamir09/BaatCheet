import { useDeepLinkAuth } from "../hooks/useDeepLinkAuth";

export function DeepLinkAuthBridge() {
  useDeepLinkAuth();
  return null;
}
