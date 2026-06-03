import { request } from "@/lib/http";
import type { AuthUser } from "@/stores/auth.store";

/** Envoltura estándar de respuestas del GRS: { message, value }. */
interface GrsEnvelope<T> {
  message: string;
  value: T;
}

interface LoginValue {
  accessToken: string;
  userId: string;
  name: string;
  username: string;
  roleId: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

/** POST /api/auth/login — endpoint público. */
export async function login(username: string, password: string): Promise<LoginResult> {
  const res = await request<GrsEnvelope<LoginValue>>("grs", "/auth/login", {
    method: "POST",
    body: { username, password },
    skipAuth: true,
  });
  const v = res.value;
  return {
    accessToken: v.accessToken,
    user: { userId: v.userId, name: v.name, username: v.username, roleId: v.roleId },
  };
}

/** POST /api/auth/token — refresca el JWT vigente. */
export async function refreshToken(): Promise<string> {
  const res = await request<{ token: string }>("grs", "/auth/token", { method: "POST" });
  return res.token;
}

/** GET /api/user/profile — perfil del usuario autenticado. */
export async function getProfile(): Promise<GrsEnvelope<AuthUser>> {
  return request("grs", "/user/profile");
}

export interface UserRestrictions {
  userId: string;
  username: string;
  name: string;
  email: string;
  roleId: string;
  disciplines?: string[] | null;
  locations?: string[] | null;
  permissions: Record<string, unknown>;
  active: boolean;
}

/** GET /api/user/restrictions — permisos del usuario (gating de UI). */
export async function getRestrictions(): Promise<GrsEnvelope<UserRestrictions>> {
  return request("grs", "/user/restrictions");
}
