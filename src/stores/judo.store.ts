import { create } from "zustand";

import type { StepResult } from "@/components/integration/setup-steps";

export type { StepResult };

interface JudoState {
  /** Código de competición compartido por toda la página JUD. */
  codigo: string;
  /** Código de evento (eventCode) para la fase de setup. */
  eventCode: string;
  /** Categoría opcional para equipos. */
  category: string;
  /** Pestaña activa de JUD. */
  tab: string;
  /** Resultado de cada paso del setup (por key de paso). */
  stepResults: Record<string, StepResult>;
  setCodigo: (v: string) => void;
  setEventCode: (v: string) => void;
  setCategory: (v: string) => void;
  setTab: (v: string) => void;
  setStepResult: (key: string, result: StepResult) => void;
}

/**
 * Estado de la página JUD (setup, código, pestaña). Vive en memoria mientras
 * la app esté abierta, por lo que sobrevive al cambiar de página y volver.
 */
export const useJudoStore = create<JudoState>((set) => ({
  codigo: "",
  eventCode: "",
  category: "",
  tab: "config",
  stepResults: {},
  setCodigo: (v) => set({ codigo: v }),
  setEventCode: (v) => set({ eventCode: v }),
  setCategory: (v) => set({ category: v }),
  setTab: (v) => set({ tab: v }),
  setStepResult: (key, result) =>
    set((s) => ({ stepResults: { ...s.stepResults, [key]: result } })),
}));
