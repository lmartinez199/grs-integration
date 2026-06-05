import { create } from "zustand";

import type { StepResult } from "@/components/integration/setup-steps";

interface ArenaState {
  /** Resultado de cada paso de sincronización de entidades (por key de paso). */
  stepResults: Record<string, StepResult>;
  setStepResult: (key: string, result: StepResult) => void;
}

/**
 * Estado de la página Arena (WRE). Vive en memoria mientras la app esté abierta,
 * por lo que el resultado de cada sync de entidades sobrevive al navegar y volver
 * —igual que en ATH ([[ath.store]]) y JUD ([[judo.store]]).
 */
export const useArenaStore = create<ArenaState>((set) => ({
  stepResults: {},
  setStepResult: (key, result) =>
    set((s) => ({ stepResults: { ...s.stepResults, [key]: result } })),
}));
