import * as React from "react";
import { Trophy } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Fila de competidor en una pelea/luta: trofeo + nombre (resaltado si gana,
 * atenuado si pierde) + una zona secundaria y otra al final (`trailing`) que
 * cada disciplina rellena con su marcador (caja de puntos, chips, etc.).
 */
export function CompetitorRow({
  name,
  secondary,
  trailing,
  isWinner = false,
  isLoser = false,
  className,
}: {
  name: React.ReactNode;
  /** Línea secundaria bajo el nombre (equipo, delegación, IRM…). */
  secondary?: React.ReactNode;
  /** Contenido al final de la fila (marcador, chips…). */
  trailing?: React.ReactNode;
  isWinner?: boolean;
  isLoser?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md px-2.5 py-2",
        isWinner && "bg-[var(--color-success)]/12",
        className,
      )}
    >
      <Trophy
        className={cn(
          "size-4 shrink-0",
          isWinner ? "text-[var(--color-success)]" : "text-transparent",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm leading-tight",
            isWinner ? "font-semibold" : "font-medium",
            isLoser && "text-[var(--color-muted-foreground)]",
          )}
        >
          {name}
        </p>
        {secondary}
      </div>
      {trailing}
    </div>
  );
}
