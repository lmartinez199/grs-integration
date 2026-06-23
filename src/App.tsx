import { useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/stores/auth.store";
import { useSettings } from "@/stores/settings.store";
import { useTheme } from "@/stores/theme.store";
import { AppLayout } from "@/components/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ArenaPage } from "@/features/arena/ArenaPage";
import { JudPage } from "@/features/judo/JudPage";
import { AthPage } from "@/features/ath/AthPage";
import { ArcoPage } from "@/features/arco/ArcoPage";
import { SwmPage } from "@/features/swimsystem/SwmPage";
import { IntegrationsPage } from "@/features/integrations/IntegrationsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";

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
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
