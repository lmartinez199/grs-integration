import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/**
 * Indicador de estado para el header de una SyncCard. Cubre los dos estados
 * comunes a todas las tarjetas (cargando → spinner, error → badge rojo) y deja
 * el resto de estados como `children`. Va dentro del `aria-live` de SyncCard.
 */
export function StatusBadge({
  loading,
  error,
  errorLabel = "sin conexión",
  children,
}: {
  loading?: boolean;
  error?: boolean;
  /** Texto del badge de error. */
  errorLabel?: string;
  /** Badge(s) para el resto de estados (éxito, inactivo, etc.). */
  children: ReactNode;
}) {
  if (loading)
    return <Loader2 className="size-4 animate-spin text-(--color-muted-foreground)" aria-hidden />;
  if (error) return <Badge variant="destructive">{errorLabel}</Badge>;
  return <>{children}</>;
}
