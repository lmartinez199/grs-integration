import { ConnectionsCard } from "@/features/config/ConnectionsCard";
import { IntegrationsSection } from "@/features/config/IntegrationsSection";

/**
 * Página unificada (fusión de Ajustes + Integraciones). Dos secciones:
 * - Conexiones: config local del cliente (URLs/keys/idioma, en el store de Tauri).
 * - Integraciones: config operativa por proveedor (backend GRS).
 */
export function ConfiguracionPage() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-(--color-muted-foreground)">
          Conexiones a los servicios e integraciones por proveedor.
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-8 overflow-auto">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-(--color-muted-foreground)">
            Conexiones
          </h2>
          <ConnectionsCard />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-(--color-muted-foreground)">
            Integraciones
          </h2>
          <IntegrationsSection />
        </section>
      </div>
    </div>
  );
}
