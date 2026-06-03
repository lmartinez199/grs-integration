import { RotateCw, Loader2, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

interface RetryNoticeProps {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

/** Aviso de "sin conexión" con un botón para reintentar manualmente. */
export function RetryNotice({ message, onRetry, isRetrying }: RetryNoticeProps) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p role="alert" className="flex items-center gap-2 text-sm text-[var(--color-destructive)]">
        <WifiOff className="size-4" aria-hidden />
        {message}
      </p>
      <Button size="sm" variant="outline" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? <Loader2 className="size-4 animate-spin" /> : <RotateCw className="size-4" />}
        Reintentar
      </Button>
    </div>
  );
}
