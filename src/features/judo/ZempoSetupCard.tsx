import { ListChecks } from "lucide-react";

import {
  zempoSetup,
  zempoSyncParticipants,
  zempoSyncStartList,
  zempoSyncTeamGroups,
  zempoSyncResults,
  zempoSyncRankings,
  zempoSyncStaff,
  zempoSyncFederacoes,
} from "@/api/grs/zempo-sync";
import { useJudoStore } from "@/stores/judo.store";
import { Input } from "@/components/ui/input";
import {
  SetupSteps,
  type SetupStep,
} from "@/components/integration/setup-steps";

/** Contexto que reciben los pasos del setup de judo. */
interface JudoCtx {
  cod: string;
  eventCode: string;
  category: string;
}

const STEPS: SetupStep<JudoCtx>[] = [
  {
    key: "setup",
    badge: "1",
    label: "Crear competición",
    desc: "Crea competiciones, fases y units desde las categorías de Zempo.",
    group: "estructura",
    requires: ({ cod, eventCode }) =>
      !cod ? "Indica el código de competición" : !eventCode ? "Indica el código de evento (eventCode)" : null,
    run: async ({ cod, eventCode }) => ({
      kind: "summary",
      data: await zempoSetup(cod, { eventCode }),
    }),
  },
  {
    key: "participants",
    badge: "2",
    label: "Participantes",
    desc: "Sincroniza los participantes inscritos.",
    group: "entidades",
    requires: ({ cod }) => (!cod ? "Indica el código de competición" : null),
    run: async ({ cod }) => ({
      kind: "summary",
      data: await zempoSyncParticipants(cod),
    }),
  },
  {
    key: "start-list",
    badge: "2b",
    label: "Start list",
    desc: "Asigna participantes a sus units de luta.",
    group: "entidades",
    requires: ({ cod }) => (!cod ? "Indica el código de competición" : null),
    run: async ({ cod }) => ({
      kind: "summary",
      data: await zempoSyncStartList(cod),
    }),
  },
  {
    key: "team-groups",
    badge: "3",
    label: "Equipos / grupos",
    desc: "Crea o actualiza los grupos (equipos) en GRS. Categoría opcional.",
    group: "entidades",
    requires: ({ cod }) => (!cod ? "Indica el código de competición" : null),
    run: async ({ cod, category }) => ({
      kind: "summary",
      data: await zempoSyncTeamGroups(cod, category ? { category } : {}),
    }),
  },
  {
    key: "results",
    badge: "4",
    label: "Resultados",
    desc: "Encola la sincronización de resultados de luchas (asíncrono).",
    group: "entidades",
    requires: ({ cod }) => (!cod ? "Indica el código de competición" : null),
    run: async ({ cod }) => ({
      kind: "queued",
      data: await zempoSyncResults(cod),
    }),
  },
  {
    key: "rankings",
    badge: "5",
    label: "Rankings",
    desc: "Sincroniza el ranking final.",
    group: "entidades",
    requires: ({ cod }) => (!cod ? "Indica el código de competición" : null),
    run: async ({ cod }) => ({
      kind: "summary",
      data: await zempoSyncRankings(cod),
    }),
  },
  {
    key: "staff",
    badge: "+",
    label: "Staff",
    desc: "Sincroniza técnicos y árbitros.",
    group: "entidades",
    requires: ({ cod }) => (!cod ? "Indica el código de competición" : null),
    run: async ({ cod }) => ({
      kind: "summary",
      data: await zempoSyncStaff(cod),
    }),
  },
  {
    key: "federacoes",
    badge: "+",
    label: "Federaciones",
    desc: "Sincroniza federaciones como organizaciones en GRS (global).",
    group: "entidades",
    run: async () => ({
      kind: "summary",
      data: await zempoSyncFederacoes(),
    }),
  },
];

export function ZempoSetupCard({ codigo }: { codigo: string }) {
  const eventCode = useJudoStore((s) => s.eventCode);
  const setEventCode = useJudoStore((s) => s.setEventCode);
  const category = useJudoStore((s) => s.category);
  const setCategory = useJudoStore((s) => s.setCategory);
  const results = useJudoStore((s) => s.stepResults);
  const setStepResult = useJudoStore((s) => s.setStepResult);

  const ctx: JudoCtx = {
    cod: codigo.trim(),
    eventCode: eventCode.trim(),
    category: category.trim(),
  };

  return (
    <SetupSteps<JudoCtx>
      title="Configuración de la competición (setup)"
      icon={<ListChecks className="size-4 text-[var(--color-primary)]" aria-hidden />}
      description="Ejecuta el flujo de sincronización por fases desde Zempo hacia el GRS. Cada paso usa tu sesión (JWT); no requiere API key."
      steps={STEPS}
      ctx={ctx}
      results={results}
      onResult={setStepResult}
      header={
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Código de evento (eventCode)
            </span>
            <Input
              placeholder="requerido para crear la competición"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Categoría (equipos, opcional)
            </span>
            <Input
              placeholder="ej. GENERAL"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
        </div>
      }
    />
  );
}
