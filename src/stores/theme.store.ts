import { create } from "zustand";

import { readPersisted, writePersisted } from "./persist";

export type Theme = "light" | "dark";

const PERSIST_KEY = "theme";
const DEFAULT_THEME: Theme = "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

interface ThemeState {
  theme: Theme;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  toggle: () => Promise<void>;
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: DEFAULT_THEME,
  hydrated: false,
  hydrate: async () => {
    const saved = (await readPersisted<Theme>(PERSIST_KEY)) ?? DEFAULT_THEME;
    applyTheme(saved);
    set({ theme: saved, hydrated: true });
  },
  setTheme: async (theme) => {
    applyTheme(theme);
    set({ theme });
    await writePersisted(PERSIST_KEY, theme);
  },
  toggle: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
}));
