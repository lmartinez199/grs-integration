import { create } from "zustand";

import { readPersisted, writePersisted } from "./persist";

export interface Settings {
  /** GRS monolito — base de la API REST (incluye prefijo /api). */
  grsBaseUrl: string;
  /** Microservicio jud-integration-zempo. */
  zempoBaseUrl: string;
  /** Microservicio ath-microservice. */
  athBaseUrl: string;
  /** API key Bearer que espera zempo (GRS_API_KEY). */
  zempoApiKey: string;
  /** API key opcional para ath (hoy ath no valida entrada). */
  athApiKey: string;
  /** Idioma para el header `language` del GRS. */
  language: string;
}

const PERSIST_KEY = "settings";

const env = import.meta.env;

/**
 * Defaults por entorno: provienen del `.env` (variables VITE_*) y, si no
 * están definidas, caen a localhost. Estos valores solo se usan la primera
 * vez; lo que el operador guarde en Ajustes los sobrescribe (plugin-store).
 */
export const DEFAULT_SETTINGS: Settings = {
  grsBaseUrl: env.VITE_GRS_BASE_URL ?? "http://localhost:3010/api",
  zempoBaseUrl: env.VITE_ZEMPO_BASE_URL ?? "http://localhost:3001/zempo",
  athBaseUrl: env.VITE_ATH_BASE_URL ?? "http://localhost:3005/api/ath",
  zempoApiKey: env.VITE_ZEMPO_API_KEY ?? "",
  athApiKey: env.VITE_ATH_API_KEY ?? "",
  language: env.VITE_LANGUAGE ?? "spa",
};

if (env.PROD) {
  const localhostUrls = [
    DEFAULT_SETTINGS.grsBaseUrl,
    DEFAULT_SETTINGS.zempoBaseUrl,
    DEFAULT_SETTINGS.athBaseUrl,
  ].filter((url) => url.includes("localhost") || url.includes("127.0.0.1"));

  if (localhostUrls.length > 0) {
    console.warn(
      "[settings] Producción con URLs apuntando a localhost — revisa el .env:\n" +
        localhostUrls.join("\n"),
    );
  }
}

interface SettingsState extends Settings {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,
  hydrate: async () => {
    const saved = await readPersisted<Partial<Settings>>(PERSIST_KEY);
    set({ ...DEFAULT_SETTINGS, ...saved, hydrated: true });
  },
  update: async (patch) => {
    const next = { ...getSettingsSnapshot(get), ...patch };
    set(patch);
    await writePersisted(PERSIST_KEY, next);
  },
}));

function getSettingsSnapshot(get: () => SettingsState): Settings {
  const s = get();
  return {
    grsBaseUrl: s.grsBaseUrl,
    zempoBaseUrl: s.zempoBaseUrl,
    athBaseUrl: s.athBaseUrl,
    zempoApiKey: s.zempoApiKey,
    athApiKey: s.athApiKey,
    language: s.language,
  };
}

/** Lectura síncrona del estado actual (para la capa http fuera de React). */
export function settingsSnapshot(): Settings {
  return getSettingsSnapshot(useSettings.getState);
}
