import { load, type Store } from "@tauri-apps/plugin-store";

/**
 * Acceso perezoso al store cifrado en disco de Tauri (plugin-store).
 * Un único archivo `grs-desktop.json` guarda settings y sesión.
 */
let storePromise: Promise<Store> | null = null;

export function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load("grs-desktop.json", { autoSave: true, defaults: {} });
  }
  return storePromise;
}

export async function readPersisted<T>(key: string): Promise<T | undefined> {
  const store = await getStore();
  return (await store.get<T>(key)) ?? undefined;
}

export async function writePersisted<T>(key: string, value: T): Promise<void> {
  const store = await getStore();
  await store.set(key, value);
}
