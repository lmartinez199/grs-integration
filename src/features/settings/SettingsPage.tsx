import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";

import { useSettings, type Settings } from "@/stores/settings.store";
import {
  getArenaSettings,
  updateArenaBaseUrl,
  updateArenaEventCode,
} from "@/api/grs/arena";
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
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Configura las conexiones a los servicios y la integración ARENA.
        </p>
      </header>

      <ConnectionsCard />
      <ArenaServerCard />
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

          <Button type="submit" disabled={isSubmitting}>
            <Save className="size-4" />
            Guardar conexiones
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const arenaServerSchema = z.object({
  baseUrl: z.url("URL inválida"),
  eventCode: z.string().min(1, "Requerido"),
});

function ArenaServerCard() {
  const qc = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["arena", "settings"],
    queryFn: getArenaSettings,
  });

  // `values` sincroniza el form con los datos del servidor sin useEffect+reset.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ baseUrl: string; eventCode: string }>({
    resolver: zodResolver(arenaServerSchema),
    values: settingsQuery.data
      ? { baseUrl: settingsQuery.data.baseUrl, eventCode: settingsQuery.data.eventCode }
      : undefined,
  });

  const saveBaseUrl = useMutation({
    mutationFn: (v: string) => updateArenaBaseUrl(v),
    onSuccess: () => {
      toast.success("Base URL de ARENA actualizada");
      qc.invalidateQueries({ queryKey: ["arena", "settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveEventCode = useMutation({
    mutationFn: (v: string) => updateArenaEventCode(v),
    onSuccess: () => {
      toast.success("Código de evento actualizado");
      qc.invalidateQueries({ queryKey: ["arena", "settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integración WRE / lucha (en el GRS)</CardTitle>
        <CardDescription>
          Estos valores se guardan en el servidor GRS, no localmente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {settingsQuery.isLoading ? (
          <Loader2 className="size-5 animate-spin text-[var(--color-muted-foreground)]" />
        ) : settingsQuery.isError ? (
          <p className="text-sm text-[var(--color-destructive)]">
            No se pudo cargar la configuración de ARENA.
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={handleSubmit((v) => {
              saveBaseUrl.mutate(v.baseUrl);
              saveEventCode.mutate(v.eventCode);
            })}
          >
            <Field label="URL del sistema WRE (Arena)" error={errors.baseUrl?.message}>
              <Input {...register("baseUrl")} placeholder="http://localhost:8080" />
            </Field>
            <Field label="Código de evento (eventCode)" error={errors.eventCode?.message}>
              <Input {...register("eventCode")} placeholder="JJB2026" />
            </Field>
            <Button
              type="submit"
              disabled={saveBaseUrl.isPending || saveEventCode.isPending}
            >
              {(saveBaseUrl.isPending || saveEventCode.isPending) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Guardar en GRS
            </Button>
          </form>
        )}
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
        <p role="alert" className="text-xs text-[var(--color-destructive)]">
          {error}
        </p>
      )}
    </div>
  );
}
