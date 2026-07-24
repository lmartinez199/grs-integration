import { useQuery } from "@tanstack/react-query";
import { Activity, Loader2, RefreshCw } from "lucide-react";

import { swmInspect } from "@/api/grs/swimsystem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Huella de "qué tan avanzado" viene el meet del proveedor. Si dos lecturas dan
 * la misma huella, el proveedor no mandó nada nuevo — que es exactamente la
 * pregunta que el operador se hace en vivo ("¿ya nadaron algo más?") y que
 * antes solo se respondía comparando JSON a ojo.
 */
interface Huella {
  /** Resultados con tiempo (crece con cada tanda nadada). */
  tiempos: number;
  /** De esos, relevos (la primera vez que pase de 0 es noticia). */
  relevos: number;
  official: number;
  unofficial: number;
  seeded: number;
}

/** Última huella distinta y cuándo apareció; persiste por meet en localStorage. */
interface Memoria {
  huella: Huella;
  ultimoCambio: string;
}

function calcularHuella(eventsRaw: unknown, resultsRaw: unknown): Huella {
  // El passthrough puede devolver el envelope del proveedor o el array plano.
  const events = extraer(eventsRaw, "events");
  const results = extraer(resultsRaw, "results");
  const h: Huella = { tiempos: 0, relevos: 0, official: 0, unofficial: 0, seeded: 0 };
  for (const r of results) {
    const row = r as { resultTimeMs?: unknown; isRelay?: unknown };
    if (typeof row.resultTimeMs === "number") {
      h.tiempos += 1;
      if (row.isRelay) h.relevos += 1;
    }
  }
  for (const e of events) {
    const status = String((e as { status?: unknown }).status ?? "");
    if (status === "OFFICIAL") h.official += 1;
    else if (status === "UNOFFICIAL") h.unofficial += 1;
    else if (status === "SEEDED") h.seeded += 1;
  }
  return h;
}

function extraer(raw: unknown, clave: string): unknown[] {
  if (Array.isArray(raw)) return raw;
  const inner = (raw as Record<string, unknown> | null)?.[clave];
  return Array.isArray(inner) ? inner : [];
}

/** Qué cambió entre dos huellas, en lenguaje de operador. Vacío = sin cambios. */
function describirCambio(antes: Huella, ahora: Huella): string[] {
  const partes: string[] = [];
  if (ahora.tiempos > antes.tiempos)
    partes.push(`+${ahora.tiempos - antes.tiempos} tiempos nuevos`);
  if (antes.relevos === 0 && ahora.relevos > 0)
    partes.push(`¡primer relevo! (${ahora.relevos} equipos)`);
  else if (ahora.relevos > antes.relevos)
    partes.push(`+${ahora.relevos - antes.relevos} relevos`);
  if (ahora.official > antes.official)
    partes.push(`+${ahora.official - antes.official} provas oficiales`);
  if (
    partes.length === 0 &&
    (ahora.unofficial !== antes.unofficial || ahora.seeded !== antes.seeded)
  ) {
    partes.push("cambio de estados de prova");
  }
  return partes;
}

function leerMemoria(clave: string): Memoria | null {
  try {
    return JSON.parse(localStorage.getItem(clave) ?? "null") as Memoria | null;
  } catch {
    return null;
  }
}

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * Card "Novedades del proveedor": consulta events+results cada 2 minutos y
 * responde de un vistazo si el proveedor mandó algo nuevo y desde cuándo está
 * quieto. Toda la memoria vive en localStorage y se compara DENTRO del fetch:
 * sin estado ni efectos, el componente solo pinta la última lectura.
 */
export function SwmNovedades({ meetId }: { meetId: string }) {
  const claveMemoria = `swm-novedades:${meetId}`;

  const consulta = useQuery({
    queryKey: ["swm", "novedades", meetId],
    queryFn: async () => {
      const [events, results] = await Promise.all([
        swmInspect(meetId, "events"),
        swmInspect(meetId, "results"),
      ]);
      const huella = calcularHuella(events, results);
      const leidoEn = new Date().toISOString();

      const previa = leerMemoria(claveMemoria);
      const sinCambio =
        previa != null &&
        JSON.stringify(previa.huella) === JSON.stringify(huella);
      const memoria: Memoria = sinCambio
        ? (previa as Memoria)
        : { huella, ultimoCambio: leidoEn };
      if (!sinCambio) {
        try {
          localStorage.setItem(claveMemoria, JSON.stringify(memoria));
        } catch {
          // Sin localStorage la card sigue sirviendo dentro de la sesión.
        }
      }
      return {
        huella,
        leidoEn,
        ultimoCambio: memoria.ultimoCambio,
        cambio: !sinCambio && previa ? describirCambio(previa.huella, huella) : [],
        primeraLectura: previa == null,
      };
    },
    enabled: Boolean(meetId),
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
  });

  const d = consulta.data;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-(--color-primary)" />
          Novedades del proveedor
        </CardTitle>
        <div className="flex items-center gap-2">
          {d && d.cambio.length > 0 && (
            <Badge variant="success">datos nuevos</Badge>
          )}
          {d && d.cambio.length === 0 && !d.primeraLectura && (
            <Badge variant="secondary">sin cambios</Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => consulta.refetch()}
            disabled={consulta.isFetching || !meetId}
          >
            {consulta.isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Verificar ahora
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!meetId ? (
          <p className="text-(--color-muted-foreground)">
            Configura el meet activo para vigilar novedades.
          </p>
        ) : consulta.isLoading ? (
          <Loader2 className="size-5 animate-spin text-(--color-muted-foreground)" />
        ) : consulta.isError ? (
          <p role="alert" className="text-(--color-destructive)">
            No se pudo consultar al proveedor.
          </p>
        ) : d ? (
          <>
            {d.cambio.length > 0 ? (
              <p className="font-medium">{d.cambio.join(" · ")}</p>
            ) : d.primeraLectura ? (
              <p className="font-medium">Primera lectura registrada.</p>
            ) : (
              <p className="font-medium text-(--color-muted-foreground)">
                El proveedor no ha mandado nada nuevo desde las{" "}
                {hora(d.ultimoCambio)}.
              </p>
            )}
            <p className="text-(--color-muted-foreground)">
              {d.huella.tiempos} tiempos · {d.huella.relevos} relevos ·{" "}
              {d.huella.official} oficiales / {d.huella.unofficial} no oficiales
              / {d.huella.seeded} sembradas · verificado {hora(d.leidoEn)}
            </p>
            <p className="text-xs text-(--color-muted-foreground)">
              Se verifica solo cada 2 minutos mientras esta pestaña esté
              abierta.
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
