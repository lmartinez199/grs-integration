import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateTimeFmt = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Formatea una fecha/hora ISO a algo legible; devuelve el original si no es fecha. */
export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : dateTimeFmt.format(d);
}

/** Detecta si un string parece una fecha ISO. */
export function looksLikeDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})?/.test(value) && !isNaN(new Date(value).getTime());
}

/** Convierte una clave técnica (camelCase, snake_case) en una etiqueta legible. */
export function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
