import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

import { currentToken, forceLogout } from "@/stores/auth.store";
import { settingsSnapshot } from "@/stores/settings.store";

/**
 * Servicios backend. La petición sale por el cliente HTTP nativo de Tauri
 * (Rust), por lo que NO está sujeta a las políticas CORS del WebView —
 * clave para consumir zempo/ath, cuyo CORS está restringido.
 */
export type Service = "grs" | "zempo" | "ath";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function baseUrl(service: Service): string {
  const s = settingsSnapshot();
  const url =
    service === "grs" ? s.grsBaseUrl : service === "zempo" ? s.zempoBaseUrl : s.athBaseUrl;
  const clean = url.replace(/\/+$/, "");
  // zempo sirve todo bajo /zempo; si la URL configurada no lo trae, lo añadimos
  // para no depender de que el operador lo escriba. Idempotente.
  if (service === "zempo" && !/\/zempo$/.test(clean)) return `${clean}/zempo`;
  return clean;
}

function authHeaders(service: Service): Record<string, string> {
  const s = settingsSnapshot();
  switch (service) {
    case "grs": {
      const token = currentToken();
      return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        language: s.language,
      };
    }
    case "zempo":
      return s.zempoApiKey ? { Authorization: `Bearer ${s.zempoApiKey}` } : {};
    case "ath":
      return s.athApiKey ? { Authorization: `Bearer ${s.athApiKey}` } : {};
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  /** No adjuntar Authorization (p. ej. el login de GRS es @Public). */
  skipAuth?: boolean;
  headers?: Record<string, string>;
}

export async function request<T = unknown>(
  service: Service,
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, skipAuth, headers = {} } = opts;
  const url = `${baseUrl(service)}${path.startsWith("/") ? path : `/${path}`}`;

  const hasBody = body !== undefined && body !== null;
  // FormData (subida de archivos): NO se serializa ni se fija Content-Type —
  // el cliente HTTP pone el boundary del multipart él mismo.
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await tauriFetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(hasBody && !isForm ? { "Content-Type": "application/json" } : {}),
      ...(skipAuth ? {} : authHeaders(service)),
      ...headers,
    },
    ...(hasBody ? { body: isForm ? (body as FormData) : JSON.stringify(body) } : {}),
  });

  // El JWT del GRS expiró o es inválido: cerrar sesión.
  if (res.status === 401 && service === "grs" && !skipAuth) {
    forceLogout();
  }

  const text = await res.text();
  const parsed = text ? safeJson(text) : undefined;

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === "object"
        ? extractMessage(parsed as Record<string, unknown>)
        : undefined) || `HTTP ${res.status} en ${path}`;
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(body: Record<string, unknown>): string | undefined {
  const candidate = body.error ?? body.message;
  return typeof candidate === "string" ? candidate : undefined;
}
