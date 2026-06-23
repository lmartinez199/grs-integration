import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Activity, Loader2, Save } from "lucide-react";

import { useSettings, type Settings } from "@/stores/settings.store";
import { zempoHealth } from "@/api/grs/zempo-sync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SettingsPage() {
  return (
    <div className="flex h-full flex-col p-6">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6">
        <header className="shrink-0">
          <h1 className="text-2xl font-semibold">Ajustes</h1>
          <p className="text-sm text-(--color-muted-foreground)">
            Configura las conexiones a los servicios.
          </p>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-auto">
          <ConnectionsCard />
        </div>
      </div>
    </div>
  );
}

const connectionsSchema = z.object({
  grsBaseUrl: z.url("URL inválida"),
  zempoBaseUrl: z.url("URL inválida"),
  athBaseUrl: z.url("URL inválida"),
  zempoApiKey: z.string(),
  athApiKey: z.string(),
  language: z.string().min(2, "Mínimo 2 caracteres"),
});

function ConnectionsCard() {
  const settings = useSettings();
  const update = useSettings((s) => s.update);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Settings>({
    resolver: zodResolver(connectionsSchema),
    defaultValues: {
      grsBaseUrl: settings.grsBaseUrl,
      zempoBaseUrl: settings.zempoBaseUrl,
      athBaseUrl: settings.athBaseUrl,
      zempoApiKey: settings.zempoApiKey,
      athApiKey: settings.athApiKey,
      language: settings.language,
    },
  });

  async function onSubmit(values: Settings) {
    await update(values);
    toast.success("Conexiones guardadas");
  }

  const testZempo = useMutation({
    mutationFn: zempoHealth,
    onSuccess: (r) => {
      if (r.connected) toast.success("Conexión con Zempo OK");
      else toast.error(`Zempo no responde${r.error ? `: ${r.error}` : ""}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conexiones</CardTitle>
        <CardDescription>
          URLs base y credenciales de los 3 servicios (se guardan localmente).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="GRS — Base URL (incluye /api)" error={errors.grsBaseUrl?.message}>
            <Input {...register("grsBaseUrl")} placeholder="http://localhost:3010/api" />
          </Field>
          <Field label="Idioma (header language del GRS)" error={errors.language?.message}>
            <Input {...register("language")} placeholder="spa" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="JUD / judo — Base URL" error={errors.zempoBaseUrl?.message}>
              <Input {...register("zempoBaseUrl")} placeholder="http://localhost:3001/zempo" />
            </Field>
            <Field label="JUD / judo — API Key (Bearer)" error={errors.zempoApiKey?.message}>
              <Input {...register("zempoApiKey")} type="password" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="ATH / atletismo — Base URL" error={errors.athBaseUrl?.message}>
              <Input {...register("athBaseUrl")} placeholder="http://localhost:3005/api/ath" />
            </Field>
            <Field label="ATH / atletismo — API Key (opcional)" error={errors.athApiKey?.message}>
              <Input {...register("athApiKey")} type="password" />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={isSubmitting}>
              <Save className="size-4" />
              Guardar conexiones
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={testZempo.isPending}
              onClick={() => testZempo.mutate()}
            >
              {testZempo.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Activity className="size-4" />
              )}
              Probar conexión Zempo
            </Button>
            {testZempo.data && (
              <Badge variant={testZempo.data.connected ? "success" : "destructive"}>
                {testZempo.data.connected ? "Zempo conectado" : "Zempo sin conexión"}
              </Badge>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-(--color-destructive)">
          {error}
        </p>
      )}
    </div>
  );
}
