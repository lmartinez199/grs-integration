import { ArenaSyncCard } from "./ArenaSyncCard";
import { ZempoSyncCard } from "./ZempoSyncCard";
import { AthSyncCard } from "./AthSyncCard";

export function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Panel de sincronización</h1>
        <p className="text-sm text-(--color-muted-foreground)">
          Controla y monitorea la sincronización de los tres servicios.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ArenaSyncCard />
        <ZempoSyncCard />
        <AthSyncCard />
      </div>
    </div>
  );
}
