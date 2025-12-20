import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiDensity = "comfortable" | "compact";

interface UiState {
  isSidebarCollapsed: boolean;
  density: UiDensity;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setDensity: (density: UiDensity) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      isSidebarCollapsed: false,
      density: "comfortable",
      setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
      toggleSidebarCollapsed: () =>
        set({ isSidebarCollapsed: !get().isSidebarCollapsed }),
      setDensity: (density) => set({ density }),
    }),
    {
      name: "foreman-ui",
      partialize: (state) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
        density: state.density,
      }),
    },
  ),
);
