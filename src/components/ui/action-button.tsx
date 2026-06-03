import type { ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { humanizeKey } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface ActionButtonProps {
  label: string;
  icon?: ReactNode;
  /** Acción a ejecutar; si devuelve { message } se usa en el toast de éxito. */
  action: () => Promise<{ message?: string } | unknown>;
  successMessage?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  disabled?: boolean;
  /** Se ejecuta tras un éxito (p. ej. invalidar queries). */
  onDone?: () => void;
}

/** Botón que dispara una acción del backend y notifica el resultado por toast. */
export function ActionButton({
  label,
  icon,
  action,
  successMessage,
  variant = "secondary",
  size = "sm",
  disabled,
  onDone,
}: ActionButtonProps) {
  const m = useMutation({
    mutationFn: action,
    onSuccess: (res) => {
      const msg =
        (res && typeof res === "object" && "message" in res
          ? (res as { message?: string }).message
          : undefined) ||
        successMessage ||
        `${label}: listo`;
      toast.success(msg, summarizeResult(res));
      onDone?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || m.isPending}
      onClick={() => m.mutate()}
    >
      {m.isPending ? <Loader2 className="size-4 animate-spin" /> : icon}
      {label}
    </Button>
  );
}

/**
 * Construye una descripción legible a partir de los datos extra del resultado:
 * conteos (números) y fecha/hora. Ignora `message`, arrays y objetos.
 */
function summarizeResult(res: unknown): string | undefined {
  if (!res || typeof res !== "object") return undefined;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(res as Record<string, unknown>)) {
    if (key === "message") continue;
    if (typeof value === "number") {
      parts.push(`${humanizeKey(key)}: ${value}`);
    } else if (
      typeof value === "string" &&
      value.trim() !== "" &&
      ["date", "time", "hour"].includes(key)
    ) {
      parts.push(`${humanizeKey(key)}: ${value}`);
    }
  }
  return parts.length ? parts.join(" · ") : undefined;
}
