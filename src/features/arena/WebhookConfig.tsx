import { useQuery } from "@tanstack/react-query";
import { Loader2, Webhook, Plus, Power, PowerOff, Trash2 } from "lucide-react";

import {
  listWebhooks,
  createWebhook,
  enableWebhook,
  disableWebhook,
  removeWebhook,
} from "@/api/grs/arena";
import { useSettings } from "@/stores/settings.store";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function WebhookConfig() {
  const grsBaseUrl = useSettings((s) => s.grsBaseUrl);
  const webhookUrl = `${grsBaseUrl.replace(/\/+$/, "")}/arena/webhook`;

  const list = useQuery({ queryKey: ["arena", "webhooks"], queryFn: listWebhooks });
  const hooks = list.data ?? [];
  // Webhook que apunta a este GRS (match exacto o por ruta /arena/webhook).
  const current =
    hooks.find((w) => w.url === webhookUrl) ??
    hooks.find((w) => w.url.includes("/arena/webhook"));

  const create = useMutationWithToast({
    mutationFn: () => createWebhook({ url: webhookUrl, name: "Integración GRS" }),
    successMsg: "Webhook registrado en Arena",
    invalidateKeys: [["arena", "webhooks"]],
  });

  const toggle = useMutationWithToast({
    mutationFn: (w: { id: number; enabled: boolean }) =>
      w.enabled ? disableWebhook(w.id) : enableWebhook(w.id),
    successMsg: "Webhook actualizado",
    invalidateKeys: [["arena", "webhooks"]],
  });

  const remove = useMutationWithToast({
    mutationFn: (id: number) => removeWebhook(id),
    successMsg: "Webhook eliminado",
    invalidateKeys: [["arena", "webhooks"]],
  });

  const isActive = current?.status === 1;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="size-4 text-[var(--color-primary)]" aria-hidden />
            Webhook de Arena
          </CardTitle>
          <CardDescription>
            Permite que Arena notifique a GRS al instante (alimenta las actualizaciones en vivo).
          </CardDescription>
        </div>
        {list.isLoading ? (
          <Loader2 className="size-4 animate-spin text-[var(--color-muted-foreground)]" aria-hidden />
        ) : list.isError ? (
          <Badge variant="destructive">sin conexión</Badge>
        ) : current ? (
          isActive ? (
            <Badge variant="success">activo</Badge>
          ) : (
            <Badge variant="warning">inactivo</Badge>
          )
        ) : (
          <Badge variant="secondary">no configurado</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            URL del receptor
          </span>
          <code className="truncate rounded bg-[var(--color-muted)] px-2 py-1 text-xs">
            {webhookUrl}
          </code>
        </div>

        {list.isError ? (
          <p role="alert" className="text-sm text-[var(--color-destructive)]">
            No se pudo consultar los webhooks (revisa la conexión con GRS).
          </p>
        ) : current ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggle.mutate({ id: current.id, enabled: isActive })}
              disabled={toggle.isPending}
            >
              {toggle.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : isActive ? (
                <PowerOff className="size-4" aria-hidden />
              ) : (
                <Power className="size-4" aria-hidden />
              )}
              {isActive ? "Desactivar" : "Activar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => remove.mutate(current.id)}
              disabled={remove.isPending}
            >
              <Trash2 className="size-4 text-[var(--color-destructive)]" aria-hidden />
              Eliminar
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            Configurar automáticamente
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
