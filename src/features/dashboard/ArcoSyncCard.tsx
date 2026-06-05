import { useQuery } from "@tanstack/react-query";
import { Loader2, Target } from "lucide-react";

import { getArcoDocuments } from "@/api/grs/arco";
import { SYNC_INTERVAL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RetryNotice } from "@/components/ui/retry-notice";
import { SyncCard } from "@/components/ui/sync-card";
import { DefinitionRow } from "@/components/ui/definition-row";

const TYPE_LABEL: Record<string, string> = {
  QualificationWin2Tec: "Clasificación",
  BracketsWin2Tec: "Brackets",
  MatchWin2Tec: "Match",
};

export function ArcoSyncCard() {
  const documents = useQuery({
    queryKey: ["arco", "documents", "summary"],
    queryFn: () => getArcoDocuments({ pageSize: 1 }),
    refetchInterval: SYNC_INTERVAL,
  });

  const total = documents.data?.total ?? 0;
  const last = documents.data?.items[0];

  return (
    <SyncCard
      title="ARC (tiro con arco)"
      icon={<Target className="size-4 text-(--color-primary)" />}
      status={
        documents.isLoading ? (
          <Loader2 className="size-4 animate-spin text-(--color-muted-foreground)" />
        ) : documents.isError ? (
          <Badge variant="destructive">sin conexión</Badge>
        ) : total > 0 ? (
          <Badge variant="success">recibiendo</Badge>
        ) : (
          <Badge variant="secondary">sin datos</Badge>
        )
      }
    >
      {documents.isError ? (
        <RetryNotice
          message="No se pudo conectar con el GRS."
          onRetry={() => documents.refetch()}
          isRetrying={documents.isFetching}
        />
      ) : (
        <dl className="space-y-1 text-sm">
          <DefinitionRow label="Documentos ODF" value={String(total)} />
          <DefinitionRow
            label="Último tipo"
            value={last ? TYPE_LABEL[last.documentType] ?? last.documentType : "—"}
          />
          <DefinitionRow
            label="Último recibido"
            value={last ? formatDateTime(last.date) : "—"}
          />
        </dl>
      )}
    </SyncCard>
  );
}
