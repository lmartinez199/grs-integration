import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

import { login } from "@/api/grs/auth";
import { useAuth } from "@/stores/auth.store";
import { useSettings } from "@/stores/settings.store";
import { ApiError } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z.object({
  username: z.string().min(1, "Usuario requerido"),
  password: z.string().min(1, "Contraseña requerida"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const grsBaseUrl = useSettings((s) => s.grsBaseUrl);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      const result = await login(values.username, values.password);
      await setSession(result);
      navigate("/", { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.status === 401 ? "Credenciales inválidas" : e.message);
      } else {
        setError("No se pudo conectar con el GRS. Revisa la URL en Configuración.");
      }
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <img src="/win2tec.svg" alt="" className="mb-2 size-12 rounded-xl" />
          <CardTitle className="text-xl">Integración GRS</CardTitle>
          <CardDescription>Inicia sesión en el GRS para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Usuario</Label>
              <Input id="username" autoFocus {...register("username")} />
              {errors.username && (
                <p className="text-xs text-(--color-destructive)">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-xs text-(--color-destructive)">
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md bg-(--color-destructive)/10 px-3 py-2 text-sm text-(--color-destructive)"
              >
                {error}
              </p>
            )}

            <Button type="submit" loading={isSubmitting}>
              Iniciar sesión
            </Button>

            <p className="text-center text-xs text-(--color-muted-foreground)">
              {grsBaseUrl}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
