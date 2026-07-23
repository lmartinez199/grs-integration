import { isTauri } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/**
 * Al abrir la app: si hay una versión nueva publicada (GitHub Releases →
 * `latest.json`, verificada con la clave pública del config), la descarga,
 * instala y reinicia. Silencioso: sin red / sin release / fallo de firma se
 * loguea y no bloquea el arranque. Solo corre dentro de Tauri (en `vite dev`
 * de navegador `isTauri()` es false y no hace nada).
 *
 * ponytail: instala y reinicia sin preguntar porque corre al arrancar (la app
 * recién abre, reiniciar molesta poco). Si algún día se quiere un prompt
 * "actualización disponible", separar downloadAndInstall del check.
 */
export async function checkForUpdates(): Promise<void> {
  if (!isTauri()) return;
  try {
    const update = await check();
    if (!update) return;
    console.info(`[updater] versión ${update.version} disponible, instalando…`);
    await update.downloadAndInstall();
    await relaunch();
  } catch (e) {
    console.warn("[updater] no se pudo comprobar actualizaciones:", e);
  }
}
