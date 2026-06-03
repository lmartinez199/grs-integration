import { sileo, Toaster as SileoToaster } from "sileo";
import "sileo/styles.css";

import { useTheme } from "@/stores/theme.store";

/**
 * Wrapper sobre Sileo (componente de toasts para React). Mantiene la misma
 * API `toast.success/error/info(msg)` que ya usan todas las pantallas, así
 * que cambiar la librería no requiere tocar los call sites.
 */
export const toast = {
  success: (message: string, description?: string) =>
    sileo.success({ title: message, description }),
  error: (message: string, description?: string) =>
    sileo.error({ title: message, description }),
  info: (message: string, description?: string) =>
    sileo.info({ title: message, description }),
};

/** Contenedor de notificaciones; sincroniza el tema con el de la app. */
export function Toaster() {
  const theme = useTheme((s) => s.theme);
  return <SileoToaster position="bottom-right" theme={theme} />;
}
