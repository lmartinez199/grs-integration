import { create } from "zustand";

import { readPersisted, writePersisted } from "./persist";

export interface AuthUser {
  userId: string;
  name: string;
  username: string;
  roleId: string;
}

interface Session {
  accessToken: string;
  user: AuthUser;
}

const PERSIST_KEY = "session";

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (session: Session) => Promise<void>;
  clear: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  hydrated: false,
  hydrate: async () => {
    const saved = await readPersisted<Session>(PERSIST_KEY);
    set({
      accessToken: saved?.accessToken ?? null,
      user: saved?.user ?? null,
      hydrated: true,
    });
  },
  setSession: async (session) => {
    set({ accessToken: session.accessToken, user: session.user });
    await writePersisted(PERSIST_KEY, session);
  },
  clear: async () => {
    set({ accessToken: null, user: null });
    await writePersisted<Session | null>(PERSIST_KEY, null);
  },
}));

/** Token actual para la capa http fuera de React. */
export function currentToken(): string | null {
  return useAuth.getState().accessToken;
}

/** Cierra sesión (usado por la capa http ante un 401). */
export function forceLogout(): void {
  void useAuth.getState().clear();
}
