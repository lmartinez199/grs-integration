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
  /**
   * Notificación persistente (no se auto-descarta) con un botón de acción.
   * Devuelve el id para descartarla con `toast.dismiss` cuando la acción corra.
   */
  action: (
    message: string,
    opts: { description?: string; buttonTitle: string; onClick: () => void },
  ) =>
    sileo.action({
      title: message,
      description: opts.description,
      duration: null,
      button: { title: opts.buttonTitle, onClick: opts.onClick },
    }),
  dismiss: (id: string) => sileo.dismiss(id),
};

/** Contenedor de notificaciones; sincroniza el tema con el de la app. */
export function Toaster() {
  const theme = useTheme((s) => s.theme);
  return <SileoToaster position="bottom-right" theme={theme} />;
}
