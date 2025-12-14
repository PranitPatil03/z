import type { ApiAuthMode } from "@/lib/api/http-client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface SessionState {
  // Portal mode: bearer token for subcontractor JWT auth
  authMode: ApiAuthMode;
  portalToken: string | null;
  // Active org context (used to scope API requests via x-org-id header or session)
  activeOrganizationId: string | null;
  setAuthMode: (authMode: ApiAuthMode) => void;
  setPortalToken: (token: string | null) => void;
  setActiveOrganizationId: (id: string | null) => void;
  clearSession: () => void;
}

const initialState = {
  authMode: "internal" as ApiAuthMode,
  portalToken: null,
  activeOrganizationId: null,
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...initialState,
      setAuthMode: (authMode) => set({ authMode }),
      setPortalToken: (portalToken) => set({ portalToken }),
      setActiveOrganizationId: (activeOrganizationId) =>
        set({ activeOrganizationId }),
      clearSession: () => set(initialState),
    }),
    {
      name: "anvil-session",
      partialize: (state) => ({
        authMode: state.authMode,
        portalToken: state.portalToken,
        activeOrganizationId: state.activeOrganizationId,
      }),
    },
  ),
);
