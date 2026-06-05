import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ListOrdered } from "lucide-react";

import {
  getFightOrder,
  type FightOrderFilters,
  type ZempoOrdemLuta,
} from "@/api/grs/zempo-sync";
import { groupFightOrderByArea } from "@/lib/domain/zempo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function OrdemLutasCard({ codigo }: { codigo: string }) {
  const [dia, setDia] = useState("");
  const [turno, setTurno] = useState("");
  const [area, setArea] = useState("");

  const filters: FightOrderFilters = {};
  if (dia) filters.dia = dia;
  if (turno) filters.turno = turno;
  if (area) filters.area = area;

  const q = useQuery({
    queryKey: ["zempo", "fight-order", codigo, dia, turno, area],
    queryFn: () => getFightOrder(codigo, filters),
    enabled: codigo.trim().length > 0,
  });

  const byArea = groupFightOrderByArea(q.data ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListOrdered className="size-4 text-[var(--color-primary)]" aria-hidden />
          Orden de lutas (tatami)
        </CardTitle>
        <CardDescription>
          Orden del día por área, día y turno desde Zempo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Input
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            aria-label="Día"
          />
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
            aria-label="Turno"
            className="h-9 rounded-md border border-[var(--color-input)] bg-transparent px-3 text-sm"
          >
            <option value="">Todos los turnos</option>
            <option value="matutino">Matutino</option>
            <option value="vespertino">Vespertino</option>
          </select>
          <Input
            placeholder="Área / tatami (opcional)"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            aria-label="Área"
          />
        </div>

        {codigo.trim().length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Indica un código de competición arriba para ver el orden de lutas.
          </p>
        ) : q.isLoading ? (
          <Loader2 className="size-5 animate-spin text-[var(--color-muted-foreground)]" aria-hidden />
        ) : q.isError ? (
          <p role="alert" className="text-sm text-[var(--color-destructive)]">
            Error al cargar el orden de lutas.
          </p>
        ) : byArea.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No hay lutas para los filtros seleccionados.
          </p>
        ) : (
          <div className="space-y-4">
            {byArea.map(([areaKey, lutas]) => (
              <div key={areaKey}>
                <h3 className="mb-1.5 text-sm font-semibold">
                  Área {areaKey}
                  <span className="ml-2 font-normal text-[var(--color-muted-foreground)]">
                    {lutas.length} lutas
                  </span>
                </h3>
                <ul className="space-y-1">
                  {lutas.map((l) => (
                    <OrdemRow key={l.id} luta={l} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OrdemRow({ luta }: { luta: ZempoOrdemLuta }) {
  const finalizada = luta.encerrada === "1";
  return (
    <li className="flex items-center gap-3 rounded-md bg-[var(--color-muted)] px-3 py-1.5 text-sm">
      <span className="w-8 shrink-0 text-center font-semibold text-[var(--color-primary)]">
        {luta.ordem}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate">
          <span className={cn(finalizada && luta.vencedor_numero === "1" && "font-semibold")}>
            {luta.competidor1_nome_completo || "—"}
          </span>
          <span className="text-[var(--color-muted-foreground)]"> vs </span>
          <span className={cn(finalizada && luta.vencedor_numero === "2" && "font-semibold")}>
            {luta.competidor2_nome_completo || "—"}
          </span>
        </p>
        <p className="truncate text-xs text-[var(--color-muted-foreground)]">
          {luta.rodada} · {luta.categoria_peso} · {luta.sexo_nome}
          {luta.tecnica_vencedora ? ` · ${luta.tecnica_vencedora}` : ""}
        </p>
      </div>
      <Badge variant={finalizada ? "success" : "secondary"}>
        {finalizada ? "finalizada" : "programada"}
      </Badge>
    </li>
  );
}
