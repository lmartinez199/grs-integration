import { useState } from "react";
import { Database } from "lucide-react";

import {
  sportTechSyncStage,
  type SportTechStageSummary,
} from "@/api/grs/sporttech";
import {
  SetupSteps,
  type SetupStep,
  type StepResult,
  type StepRunResult,
} from "@/components/integration/setup-steps";

interface Ctx {
  eventId: string;
}

/** Resumen de una etapa → paso, con label propio de gimnasia + sus errores. */
function step(r: SportTechStageSummary, label: string): StepRunResult {
  return {
    kind: "summary",
    data: { processed: 0, created: 0, skipped: 0, errors: r.errors ?? [], label },
  };
}

const requireEvent = (ctx: Ctx) =>
  ctx.eventId ? null : "Pegá el UUID del evento del OVS.";

/**
 * Pasos del sync de gimnasia (SportTech), en orden de dependencia. «Estructura»
 * arma el esqueleto; «entidades» empuja los datos del OVS. Cada paso muestra su
 * resumen propio (units/participantes/conjuntos/medallas) y sus errores.
 */
const STEPS: SetupStep<Ctx>[] = [
  {
    key: "structure",
    badge: "1",
    label: "Estructura",
    desc: "Categorías, sport-events, competiciones, fases y units del evento.",
    group: "estructura",
    requires: requireEvent,
    run: async (ctx) => {
      const r = await sportTechSyncStage(ctx.eventId, "structure");
      return step(
        r,
        `${r.units ?? 0} units · ${r.sportEventsCreated ?? 0} sport-events nuevos`,
      );
    },
  },
  {
    key: "participants",
    badge: "1",
    label: "Participantes",
    desc: "Atletas → participantes (code = ExternalID FIG; org auto-creada).",
    group: "entidades",
    requires: requireEvent,
    run: async (ctx) => {
      const r = await sportTechSyncStage(ctx.eventId, "participants");
      return step(r, `${r.athletes ?? 0} participantes`);
    },
  },
  {
    key: "groups",
    badge: "2",
    label: "Grupos (conjuntos)",
    desc: "Conjuntos de rítmica → colección groups. Requiere participantes.",
    group: "entidades",
    requires: requireEvent,
    run: async (ctx) => {
      const r = await sportTechSyncStage(ctx.eventId, "groups");
      return step(r, `${r.groups ?? 0} conjuntos`);
    },
  },
  {
    key: "results",
    badge: "3",
    label: "Resultados",
    desc: "Marcas, estado de unit (Frame.State) y medallero (individual y por equipo).",
    group: "entidades",
    requires: requireEvent,
    run: async (ctx) => {
      const r = await sportTechSyncStage(ctx.eventId, "results");
      return step(
        r,
        `${r.results ?? 0} units con marca · ${r.awards ?? 0} medallas`,
      );
    },
  },
];

/** Stepper de operación de gimnasia para un eventId, espejo del Setup de ATH. */
export function SportTechSyncSteps({ eventId }: { eventId: string }) {
  const [results, setResults] = useState<Record<string, StepResult>>({});
  return (
    <SetupSteps<Ctx>
      title="Sync del evento"
      icon={<Database className="size-4 text-(--color-primary)" />}
      description="Dispará el pull por etapa (orden de dependencia). Cada paso muestra su resumen y sus errores."
      steps={STEPS}
      ctx={{ eventId }}
      results={results}
      onResult={(k, r) => setResults((p) => ({ ...p, [k]: r }))}
    />
  );
}
