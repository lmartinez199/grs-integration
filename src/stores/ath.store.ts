import { create } from "zustand";

import type { StepResult } from "@/components/integration/setup-steps";

interface AthState {
  /** Resultado de cada paso del setup/sync (por key de paso). */
  stepResults: Record<string, StepResult>;
  setStepResult: (key: string, result: StepResult) => void;
}

/**
 * Estado de la página ATH. Vive en memoria mientras la app esté abierta, por lo
 * que el resultado de cada paso de setup sobrevive al cambiar de página y volver
 * —igual que en JUD (ver [[judo.store]]).
 */
export const useAthStore = create<AthState>((set) => ({
  stepResults: {},
  setStepResult: (key, result) =>
    set((s) => ({ stepResults: { ...s.stepResults, [key]: result } })),
}));
