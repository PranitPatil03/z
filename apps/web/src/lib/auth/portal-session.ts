import { useSessionStore } from "@/store/session-store";

export function setPortalSession(token: string) {
  const state = useSessionStore.getState();
  state.setPortalToken(token);
  state.setAuthMode("portal");
}

export function clearPortalSession() {
  const state = useSessionStore.getState();
  state.setPortalToken(null);
  state.setAuthMode("internal");
}

export function hasPortalSession() {
  return Boolean(useSessionStore.getState().portalToken);
}
