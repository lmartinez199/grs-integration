import { AthLoopSection } from "./AthLoopSection";
import { AthSetupSteps } from "./AthSetupSteps";
import { AthReadSection } from "./AthReadSection";

export function AthPage() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold">ATH (atletismo)</h1>
        <p className="text-sm text-(--color-muted-foreground)">
          Control de sincronización, setup en GRS y consulta de datos del CBAT.
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-auto">
        <AthLoopSection />
        <AthSetupSteps />
        <AthReadSection />
      </div>
    </div>
  );
}
