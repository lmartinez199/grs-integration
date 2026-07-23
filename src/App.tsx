import { useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/stores/auth.store";
import { useSettings } from "@/stores/settings.store";
import { useTheme } from "@/stores/theme.store";
import { checkForUpdates } from "@/lib/updater";
import { AppLayout } from "@/components/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ArenaPage } from "@/features/arena/ArenaPage";
import { JudPage } from "@/features/judo/JudPage";
import { AthPage } from "@/features/ath/AthPage";
import { ArcoPage } from "@/features/arco/ArcoPage";
import { SwmPage } from "@/features/swimsystem/SwmPage";
import { SportTechPage } from "@/features/sporttech/SportTechPage";
import { ConfiguracionPage } from "@/features/config/ConfiguracionPage";

function ProtectedRoute() {
  const token = useAuth((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const hydrateAuth = useAuth((s) => s.hydrate);
  const hydrateSettings = useSettings((s) => s.hydrate);
  const hydrateTheme = useTheme((s) => s.hydrate);

  useEffect(() => {
    Promise.all([hydrateAuth(), hydrateSettings(), hydrateTheme()]).finally(() =>
      setReady(true),
    );
  }, [hydrateAuth, hydrateSettings, hydrateTheme]);

  // Auto-actualización al arranque (no-op fuera de Tauri).
  useEffect(() => {
    void checkForUpdates();
  }, []);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-(--color-muted-foreground)" />
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/arena" element={<ArenaPage />} />
          <Route path="/judo" element={<JudPage />} />
          <Route path="/ath" element={<AthPage />} />
          <Route path="/arco" element={<ArcoPage />} />
          <Route path="/swm" element={<SwmPage />} />
          <Route
            path="/sporttech-gar"
            element={
              // key={provider}: las 2 rutas montan el MISMO componente en la misma
              // posición → sin key React reusa la instancia al navegar entre
              // disciplinas y el estado local (eventId) se filtra de una a otra.
              <SportTechPage
                key="sporttech-gar"
                provider="sporttech-gar"
                title="GAR (artística)"
              />
            }
          />
          <Route
            path="/sporttech-gry"
            element={
              <SportTechPage
                key="sporttech-gry"
                provider="sporttech-gry"
                title="GRY (rítmica)"
              />
            }
          />
          <Route path="/config" element={<ConfiguracionPage />} />
          {/* Rutas antiguas fusionadas en /config. */}
          <Route path="/integrations" element={<Navigate to="/config" replace />} />
          <Route path="/settings" element={<Navigate to="/config" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
