import { create } from "zustand";

interface HeaderState {
  routePathOverride: string | null;
  titleOverride: string | null;
  subtitleOverride: string | null;
  setHeaderOverride: (
    routePath: string,
    title: string,
    subtitle?: string | null,
  ) => void;
  clearHeaderOverride: () => void;
}

const initialState = {
  routePathOverride: null,
  titleOverride: null,
  subtitleOverride: null,
};

export const useHeaderStore = create<HeaderState>()((set) => ({
  ...initialState,
  setHeaderOverride: (routePath, title, subtitle = null) =>
    set({
      routePathOverride: routePath,
      titleOverride: title,
      subtitleOverride: subtitle,
    }),
  clearHeaderOverride: () => set(initialState),
}));
