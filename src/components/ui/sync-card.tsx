import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Card de estado de sincronización: header con icono + título y un badge de
 * estado a la derecha. El badge va dentro de una región `aria-live` para que
 * los lectores de pantalla anuncien los cambios de estado (conexión, sync).
 */
export function SyncCard({
  title,
  icon,
  status,
  children,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  /** Badge/indicador de estado; se anuncia al cambiar. */
  status?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2.5 text-base">
          {icon && (
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-(--color-primary)/12 text-(--color-primary)">
              {icon}
            </span>
          )}
          {title}
        </CardTitle>
        <span aria-live="polite" aria-atomic="true">
          {status}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}
