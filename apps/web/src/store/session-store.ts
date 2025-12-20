import type { ApiAuthMode } from "@/lib/api/http-client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SessionUser {
  id: string;
  name: string;
  role: string;
}

interface SessionState {
  authMode: ApiAuthMode;
  portalToken: string | null;
  user: SessionUser | null;
  setAuthMode: (authMode: ApiAuthMode) => void;
  setPortalToken: (token: string | null) => void;
  setUser: (user: SessionUser | null) => void;
  clearSession: () => void;
}

const initialState = {
  authMode: "internal" as ApiAuthMode,
  portalToken: null,
  user: null,
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...initialState,
      setAuthMode: (authMode) => set({ authMode }),
      setPortalToken: (portalToken) => set({ portalToken }),
      setUser: (user) => set({ user }),
      clearSession: () => set(initialState),
    }),
    {
      name: "foreman-session",
      partialize: (state) => ({
        authMode: state.authMode,
        portalToken: state.portalToken,
        user: state.user,
      }),
    },
  ),
);
