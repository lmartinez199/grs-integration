import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";

import { getIntegration } from "@/api/grs/integrations";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { RunHistory } from "./run-history";

/**
 * Último sync + historial de corridas de una integración, para verlo en la
 * pestaña Sync de la página del proveedor (sin ir a Integraciones). Botón
 * Refrescar porque las acciones de sync escriben los runs en el backend (no hay
 * push al front).
 */
export function SyncHistoryCard({ provider }: { provider: string }) {
  const integration = useQuery({
    queryKey: ["integrations", provider],
    queryFn: () => getIntegration(provider),
    retry: false,
  });
  const data = integration.data;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Historial de sincronización</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => integration.refetch()}
          disabled={integration.isFetching}
        >
          {integration.isFetching ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          Refrescar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {integration.isLoading ? (
          <Loader2
            className="size-5 animate-spin text-(--color-muted-foreground)"
            aria-hidden
          />
        ) : integration.isError || !data ? (
          <p className="text-sm text-(--color-muted-foreground)">
            Sin datos de integración.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-(--color-muted-foreground)">
                Último sync:{" "}
                <span className="text-(--color-foreground)">
                  {data.lastSyncAt ? formatDateTime(data.lastSyncAt) : "—"}
                </span>
              </span>
              {data.lastSyncStatus && (
                <Badge
                  variant={
                    data.lastSyncStatus === "ok" ? "success" : "destructive"
                  }
                  className="text-xs"
                >
                  {data.lastSyncStatus}
                </Badge>
              )}
            </div>
            {data.lastSyncError && (
              <p className="text-xs text-(--color-destructive)">
                {data.lastSyncError}
              </p>
            )}
            {data.runs?.length ? (
              <RunHistory runs={data.runs} />
            ) : (
              <p className="text-sm text-(--color-muted-foreground)">
                Todavía no hay corridas registradas. Dispará un sync para ver el
                historial.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
