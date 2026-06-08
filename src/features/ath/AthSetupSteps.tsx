import { Database } from "lucide-react";

import * as ath from "@/api/ath";
import type { AthActionResult } from "@/api/ath";
import { useAthStore } from "@/stores/ath.store";
import {
  SetupSteps,
  type SetupStep,
  type StepRunResult,
} from "@/components/integration/setup-steps";

const n = (v: unknown): number => (typeof v === "number" ? v : 0);

/** Convierte un error del backend (string u objeto) a un mensaje legible. */
function fmtError(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const msg = o.message ?? o.error ?? o.reason;
    if (typeof msg === "string") return msg;
    return JSON.stringify(e);
  }
  return String(e);
}

function summary(
  raw: AthActionResult,
  created: number,
  processed: number,
  skipped: number,
  updated = 0,
): StepRunResult {
  const list = Array.isArray(raw.errors) ? raw.errors.map(fmtError) : [];
  const failed = n(raw.failed);
  const errors = list.length === 0 && failed > 0 ? [`${failed} con error`] : list;
  return { kind: "summary", data: { created, processed, skipped, updated, errors } };
}

/**
 * Pasos de ATH. La estructura es granular (el ath-microservice expone un
 * endpoint por nivel) y «Ejecutar todo» del grupo los corre en orden de
 * dependencia: categorías → competiciones → fases → unidades.
 */
const ATH_STEPS: SetupStep<Record<string, never>>[] = [
  {
    key: "categories",
    badge: "1",
    label: "Categorías",
    desc: "Crea el catálogo de categorías de edad en GRS.",
    group: "estructura",
    run: async () => {
      const r = await ath.setupCategories();
      return summary(r, n(r.created), n(r.processed), 0);
    },
  },
  {
    key: "competitions",
    badge: "2",
    label: "Competiciones",
    desc: "Crea las competiciones (eventos) en GRS desde el CBAT.",
    group: "estructura",
    run: async () => {
      const r = await ath.setup();
      return summary(r, n(r.created), n(r.processed), n(r.skipped));
    },
  },
  {
    key: "phases",
    badge: "3",
    label: "Fases",
    desc: "Crea los phase codes y las fases (series) de cada competición.",
    group: "estructura",
    run: async () => {
      const r = await ath.setupPhases();
      return summary(
        r,
        n(r.phaseCodesCreated) + n(r.phasesCreated),
        n(r.processed),
        0,
        n(r.phaseCodesUpdated),
      );
    },
  },
  {
    key: "units",
    badge: "4",
    label: "Unidades",
    desc: "Envía las unidades (series) al GRS y elimina las huérfanas.",
    group: "estructura",
    run: async () => {
      const r = await ath.setupUnits();
      return summary(r, 0, n(r.unitsProcessed), n(r.unitsDeleted));
    },
  },
  {
    key: "organisations",
    badge: "1",
    label: "Organizaciones",
    desc: "Sincroniza clubes / UFs / delegaciones.",
    group: "entidades",
    run: async () => {
      const r = await ath.syncOrganisations();
      return summary(r, n(r.created), n(r.total), n(r.existed));
    },
  },
  {
    key: "participants",
    badge: "2",
    label: "Participantes",
    desc: "Sincroniza los atletas del CBAT.",
    group: "entidades",
    run: async () => {
      const r = await ath.syncParticipants();
      return summary(
        r,
        n(r.created),
        n(r.total),
        n(r.matchedByCode) + n(r.matchedByFallback),
      );
    },
  },
  {
    key: "groups",
    badge: "3",
    label: "Grupos (relevos)",
    desc: "Crea los equipos de relevo. Requiere participantes sincronizados.",
    group: "entidades",
    run: async () => {
      const r = await ath.syncGroups();
      return summary(r, n(r.created), n(r.total), 0, n(r.updated));
    },
  },
  {
    key: "medals",
    badge: "4",
    label: "Medallas",
    desc: "Genera las medallas (oro/plata/bronce) de las finales individuales.",
    group: "entidades",
    run: async () => {
      const r = await ath.syncMedals();
      return summary(r, n(r.created), n(r.total), 0);
    },
  },
];

const ATH_CTX: Record<string, never> = {};

export function AthSetupSteps() {
  const results = useAthStore((s) => s.stepResults);
  const setStepResult = useAthStore((s) => s.setStepResult);
  return (
    <SetupSteps<Record<string, never>>
      title="Setup en GRS"
      icon={<Database className="size-4 text-(--color-primary)" />}
      description="Prepara la estructura del evento y envía los datos del CBAT al GRS."
      steps={ATH_STEPS}
      ctx={ATH_CTX}
      results={results}
      onResult={setStepResult}
    />
  );
}
