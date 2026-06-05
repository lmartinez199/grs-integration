import { AthLoopSection } from "./AthLoopSection";
import { AthSetupSteps } from "./AthSetupSteps";
import { AthReadSection } from "./AthReadSection";

export function AthPage() {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">ATH (atletismo)</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Control de sincronización, setup en GRS y consulta de datos del CBAT.
        </p>
      </header>

      <AthLoopSection />
      <AthSetupSteps />
      <AthReadSection />
    </div>
  );
}
