import { ArenaSyncCard } from "./ArenaSyncCard";
import { ZempoSyncCard } from "./ZempoSyncCard";
import { AthSyncCard } from "./AthSyncCard";
import { ArcoSyncCard } from "./ArcoSyncCard";

export function DashboardPage() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold">Panel de sincronización</h1>
        <p className="text-sm text-(--color-muted-foreground)">
          Controla y monitorea la sincronización de los tres servicios.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-4">
          <ArenaSyncCard />
          <ZempoSyncCard />
          <AthSyncCard />
          <ArcoSyncCard />
        </div>
      </div>
    </div>
  );
}
