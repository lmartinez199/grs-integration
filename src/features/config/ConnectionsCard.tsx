import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Activity, Save } from "lucide-react";

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

const connectionsSchema = z.object({
  grsBaseUrl: z.url("URL inválida"),
  zempoBaseUrl: z.url("URL inválida"),
  athBaseUrl: z.url("URL inválida"),
  zempoApiKey: z.string(),
  athApiKey: z.string(),
  language: z.string().min(2, "Mínimo 2 caracteres"),
});

type PresetValues = Pick<
  Settings,
  "grsBaseUrl" | "zempoBaseUrl" | "athBaseUrl" | "language"
>;

/**
 * Entornos precargados para alternar rápido mientras se prueba (URLs + idioma;
 * NO toca las API keys). Lo guardado en Ajustes siempre pisa al `.env`, así que
 * el switch vive acá y no en variables de entorno.
 */
const ENV_PRESETS: { key: string; label: string; values: PresetValues }[] = [
  {
    key: "local",
    label: "Local",
    values: {
      grsBaseUrl: "http://localhost:3010/api",
      zempoBaseUrl: "http://localhost:3001/zempo",
      athBaseUrl: "http://localhost:3005/api/ath",
      language: "por",
    },
  },
  {
    key: "dev",
    label: "Dev remoto",
    values: {
      grsBaseUrl: "https://devovrs.srv.win2tec.es/b",
      zempoBaseUrl: "https://jud-integration-zempo.srv.win2tec.es/zempo",
      athBaseUrl: "https://ath-microservice.srv.win2tec.es/api/ath",
      language: "eng",
    },
  },
];

export function ConnectionsCard() {
  const settings = useSettings();
  const update = useSettings((s) => s.update);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
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

  /** Aplica y GUARDA el preset (URLs + idioma); las API keys quedan como están. */
  async function applyPreset(preset: (typeof ENV_PRESETS)[number]) {
    reset({ ...getValues(), ...preset.values });
    await update(preset.values);
    toast.success(`Entorno ${preset.label} aplicado`);
  }

  const activePreset = ENV_PRESETS.find(
    (p) => p.values.grsBaseUrl === settings.grsBaseUrl,
  )?.key;

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
          <div className="flex items-center gap-2">
            <Label>Entorno</Label>
            {ENV_PRESETS.map((p) => (
              <Button
                key={p.key}
                type="button"
                size="sm"
                variant={activePreset === p.key ? "default" : "outline"}
                onClick={() => void applyPreset(p)}
              >
                {p.label}
              </Button>
            ))}
          </div>

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
            <Button type="submit" icon={<Save />} loading={isSubmitting}>
              Guardar conexiones
            </Button>
            <Button
              type="button"
              variant="outline"
              icon={<Activity />}
              loading={testZempo.isPending}
              onClick={() => testZempo.mutate()}
            >
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
