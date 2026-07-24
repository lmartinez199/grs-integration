import { isTauri } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

import { toast } from "@/components/ui/toast";

/**
 * Al abrir la app: si hay una versión nueva publicada (GitHub Releases →
 * `latest.json`, verificada con la clave pública del config), muestra una
 * notificación persistente con botón "Actualizar ahora"; al pulsarlo descarga,
 * instala y reinicia. Antes instalaba en silencio al arrancar — el operador no
 * sabía ni que había versión nueva ni por qué la app se reiniciaba sola.
 *
 * Tolerante: sin red / sin release / fallo de firma se loguea y no bloquea el
 * arranque. Solo corre dentro de Tauri (en `vite dev` de navegador `isTauri()`
 * es false y no hace nada).
 */
export async function checkForUpdates(): Promise<void> {
  if (!isTauri()) return;
  try {
    const update = await check();
    if (!update) return;
    console.info(`[updater] versión ${update.version} disponible`);
    const id = toast.action(`Actualización disponible: v${update.version}`, {
      description: "Se descargará y la app se reiniciará sola al terminar.",
      buttonTitle: "Actualizar ahora",
      onClick: () => {
        toast.dismiss(id);
        void instalar(update);
      },
    });
  } catch (e) {
    console.warn("[updater] no se pudo comprobar actualizaciones:", e);
  }
}

async function instalar(update: Update): Promise<void> {
  try {
    toast.info(
      `Descargando v${update.version}…`,
      "La app se reiniciará al terminar.",
    );
    await update.downloadAndInstall();
    await relaunch();
  } catch (e) {
    console.warn("[updater] instalación fallida:", e);
    toast.error(
      "No se pudo instalar la actualización",
      "Reintenta al volver a abrir la app.",
    );
  }
}
