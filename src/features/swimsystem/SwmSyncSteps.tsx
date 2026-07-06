import { useState } from "react";
import { Database } from "lucide-react";

import { swmSyncStage, type SwmStageSummary } from "@/api/grs/swimsystem";
import {
  SetupSteps,
  type SetupStep,
  type StepResult,
  type StepRunResult,
} from "@/components/integration/setup-steps";

interface Ctx {
  meetId: string;
}

/** Resumen de una etapa → paso, con label propio de SWM + sus errores. */
function step(r: SwmStageSummary, label: string): StepRunResult {
  return {
    kind: "summary",
    data: { processed: 0, created: 0, skipped: 0, errors: r.errors ?? [], label },
  };
}

const requireMeet = (ctx: Ctx) =>
  ctx.meetId ? null : "Pega el meetId de SwimSystem.";

/**
 * Pasos del sync de natación (SwimSystem) en 3 grupos: «estructura» (esqueleto),
 * «entidades» (carga inicial: organizaciones → participantes → relevos →
 * start-lists) y «resultados» (aparte; durante/después de la competencia). Mismo
 * layout que gimnasia. Cada paso es idempotente y re-asegura lo que necesita.
 */
const STEPS: SetupStep<Ctx>[] = [
  {
    key: "structure",
    label: "Estructura",
    desc: "Esqueleto del meet: pruebas, fases y units.",
    group: "estructura",
    requires: requireMeet,
    run: async (ctx) => {
      const r = await swmSyncStage(ctx.meetId, "structure");
      return step(r, `${r.events ?? 0} pruebas`);
    },
  },
  {
    key: "organisations",
    label: "Organizaciones",
    desc: "Clubes/federaciones → organizaciones de GRS.",
    group: "entidades",
    requires: requireMeet,
    run: async (ctx) => {
      const r = await swmSyncStage(ctx.meetId, "organisations");
      return step(r, `${r.clubs ?? 0} clubes`);
    },
  },
  {
    key: "participants",
    label: "Participantes",
    desc: "Nadadores → participantes.",
    group: "entidades",
    requires: requireMeet,
    run: async (ctx) => {
      const r = await swmSyncStage(ctx.meetId, "participants");
      return step(r, `${r.athletes ?? 0} participantes`);
    },
  },
  {
    key: "groups",
    label: "Grupos (relevos)",
    desc: "Relevos → colección groups.",
    group: "entidades",
    requires: requireMeet,
    run: async (ctx) => {
      const r = await swmSyncStage(ctx.meetId, "groups");
      return step(r, `${r.groups ?? 0} relevos`);
    },
  },
  {
    key: "start-lists",
    label: "Start-lists",
    desc: "Inscripciones por prueba (heats/series).",
    group: "entidades",
    requires: requireMeet,
    run: async (ctx) => {
      const r = await swmSyncStage(ctx.meetId, "start-lists");
      return step(r, "start-lists sincronizadas");
    },
  },
  {
    key: "results",
    label: "Resultados",
    desc: "Marcas, tiempos y medallero.",
    group: "resultados",
    requires: requireMeet,
    run: async (ctx) => {
      const r = await swmSyncStage(ctx.meetId, "results");
      return step(r, `${r.results ?? 0} resultados`);
    },
  },
];

/** Stepper de operación de natación para un meetId (mismo layout que gimnasia). */
export function SwmSyncSteps({ meetId }: { meetId: string }) {
  const [results, setResults] = useState<Record<string, StepResult>>({});
  return (
    <SetupSteps<Ctx>
      title="Sync por etapa"
      icon={<Database className="size-4 text-(--color-primary)" />}
      description="Dispara el pull por etapa (orden de dependencia). Cada paso muestra su resumen y sus errores."
      steps={STEPS}
      ctx={{ meetId }}
      results={results}
      onResult={(k, r) => setResults((p) => ({ ...p, [k]: r }))}
    />
  );
}
