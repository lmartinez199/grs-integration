import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileDown, Inbox } from "lucide-react";

import { getArcoDocuments, getArcoDocument } from "@/api/grs/arco";
import { SYNC_INTERVAL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useArcoStore } from "@/stores/arco.store";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DataView } from "@/components/ui/data-view";
import { RetryNotice } from "@/components/ui/retry-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TYPE_LABEL: Record<string, string> = {
  QualificationWin2Tec: "Clasificación",
  BracketsWin2Tec: "Brackets",
  MatchWin2Tec: "Match",
};

const TYPE_OPTIONS = [
  { value: "", label: "Todos los tipos" },
  { value: "BracketsWin2Tec", label: "Brackets" },
  { value: "QualificationWin2Tec", label: "Clasificación" },
  { value: "MatchWin2Tec", label: "Match" },
];

export function ArcoMonitor() {
  const selectedId = useArcoStore((s) => s.selectedDocId);
  const setSelectedId = useArcoStore((s) => s.setSelectedDocId);
  const filterId = useId();
  const [type, setType] = useState("");

  const documents = useQuery({
    queryKey: ["arco", "documents", "list", type],
    queryFn: () => getArcoDocuments({ pageSize: 50, type: type || undefined }),
    refetchInterval: SYNC_INTERVAL,
  });

  const items = documents.data?.items ?? [];

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
      <Card className="flex min-h-0 flex-col">
        <CardHeader className="shrink-0 flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Inbox className="size-4 text-(--color-primary)" aria-hidden />
            Documentos recibidos
          </CardTitle>
          {documents.isLoading ? (
            <Loader2 className="size-4 animate-spin text-(--color-muted-foreground)" aria-hidden />
          ) : documents.isError ? (
            <Badge variant="destructive">sin conexión</Badge>
          ) : (
            <Badge variant="secondary">{documents.data?.total ?? 0} total</Badge>
          )}
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex w-56 max-w-full shrink-0 flex-col gap-1">
            <Label htmlFor={filterId} className="text-xs">Filtrar por tipo</Label>
            <select
              id={filterId}
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex h-9 w-full rounded-md border bg-(--color-background) px-3 text-sm text-(--color-foreground) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-ring)"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {documents.isError ? (
            <RetryNotice
              message="No se pudieron cargar los documentos ODF de arco."
              onRetry={() => documents.refetch()}
              isRetrying={documents.isFetching}
            />
          ) : items.length === 0 && !documents.isLoading ? (
            <p className="text-sm text-(--color-muted-foreground)">
              No hay documentos ODF de arco para este filtro.
            </p>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-(--color-muted-foreground)">
                    <th scope="col" className="py-1.5 pr-2 font-medium">Fecha</th>
                    <th scope="col" className="py-1.5 pr-2 font-medium">Tipo</th>
                    <th scope="col" className="py-1.5 pr-2 font-medium">Competición</th>
                    <th scope="col" className="py-1.5 pr-3 font-medium">Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((doc) => {
                    const isSel = doc.id === selectedId;
                    return (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedId(doc.id)}
                        aria-current={isSel}
                        className={cn(
                          "cursor-pointer border-t border-(--color-border) transition-colors hover:bg-(--color-muted)/50",
                          isSel && "bg-(--color-primary)/10",
                        )}
                      >
                        <td className="py-1.5 pr-2 tabular-nums text-(--color-muted-foreground)">
                          {formatDateTime(doc.date)}
                        </td>
                        <td className="py-1.5 pr-2">
                          <Badge variant="secondary">
                            {TYPE_LABEL[doc.documentType] ?? doc.documentType}
                          </Badge>
                        </td>
                        <td className="py-1.5 pr-2 font-medium">{doc.competitionCode}</td>
                        <td className="truncate py-1.5 pr-3 font-mono text-xs">{doc.documentCode}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentDetail id={selectedId} />
    </div>
  );
}

function DocumentDetail({ id }: { id: string | null }) {
  const detail = useQuery({
    queryKey: ["arco", "document", id],
    queryFn: () => getArcoDocument(id!),
    enabled: id != null,
  });

  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileDown className="size-4 text-(--color-primary)" aria-hidden />
          Contenido del documento
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-auto">
        {id == null ? (
          <p className="text-sm text-(--color-muted-foreground)">
            Selecciona un documento para ver lo que llegó.
          </p>
        ) : detail.isLoading ? (
          <Loader2 className="size-5 animate-spin text-(--color-muted-foreground)" aria-hidden />
        ) : detail.isError ? (
          <p role="alert" className="text-sm text-(--color-destructive)">
            No se pudo cargar el documento.
          </p>
        ) : (
          <div className="pr-1">
            <DataView data={detail.data?.content} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

