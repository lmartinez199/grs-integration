import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import { queryClient } from "@/lib/query";
import { Toaster } from "@/components/ui/toast";
import { useAuth } from "@/stores/auth.store";
import "./index.css";

// ponytail: handle de dev para previsualizar rutas protegidas en navegador
// (fuera de Tauri no hay sesión). Se elimina del bundle de producción.
if (import.meta.env.DEV) (window as unknown as { useAuth: typeof useAuth }).useAuth = useAuth;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </React.StrictMode>,
);
