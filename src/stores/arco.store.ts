import { create } from "zustand";

interface ArcoState {
  /** Pestaña activa de ARCO ("monitor" | "competencia"). */
  tab: string;
  /** Documento ODF seleccionado en el monitor (id). */
  selectedDocId: string | null;
  setTab: (v: string) => void;
  setSelectedDocId: (id: string | null) => void;
}

/** Estado de la página ARCO. Vive en memoria mientras la app está abierta. */
export const useArcoStore = create<ArcoState>((set) => ({
  tab: "monitor",
  selectedDocId: null,
  setTab: (v) => set({ tab: v }),
  setSelectedDocId: (id) => set({ selectedDocId: id }),
}));
