import { useQuery } from "@tanstack/react-query";
import { Loader2, Medal } from "lucide-react";

import { getZempoResults } from "@/api/grs/zempo-sync";
import { MEDAL, groupResultsByCategoria } from "@/lib/domain/zempo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ResultadosCard({ codigo }: { codigo: string }) {
  const q = useQuery({
    queryKey: ["zempo", "results", codigo],
    queryFn: () => getZempoResults(codigo),
    enabled: codigo.trim().length > 0,
  });

  const byCategoria = groupResultsByCategoria(q.data ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Medal className="size-4 text-(--color-primary)" aria-hidden />
          Resultados finales (pódio)
        </CardTitle>
        <CardDescription>
          Pódio por categoría una vez finalizada la competición.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {codigo.trim().length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">
            Indica un código de competición arriba para ver los resultados.
          </p>
        ) : q.isLoading ? (
          <Loader2 className="size-5 animate-spin text-(--color-muted-foreground)" aria-hidden />
        ) : q.isError ? (
          <p role="alert" className="text-sm text-(--color-destructive)">
            Error al cargar los resultados.
          </p>
        ) : byCategoria.length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">
            Aún no hay resultados finales para esta competición.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {byCategoria.map(([key, podio]) => (
              <div
                key={key}
                className="rounded-md border border-(--color-border) p-3"
              >
                <h3 className="mb-1.5 text-sm font-semibold">
                  {podio[0]?.categoria_peso || key}
                </h3>
                <ol className="space-y-1">
                  {podio.map((r) => (
                    <li
                      key={`${r.atleta_codigo}-${r.colocacao_orden}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="w-6 text-center">
                        {MEDAL[r.colocacao] ?? r.colocacao}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {r.atleta_nome_completo}
                      </span>
                      <span className="shrink-0 text-xs text-(--color-muted-foreground)">
                        {r.atleta_federacao_sigla}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
