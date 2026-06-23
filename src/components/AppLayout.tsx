import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Swords, Hand, Timer, Target, Waves, Cable, Settings, LogOut, Sun, Moon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth.store";
import { useTheme } from "@/stores/theme.store";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/arena", label: "WRE (lucha)", icon: Swords, end: false },
  { to: "/judo", label: "JUD (judo)", icon: Hand, end: false },
  { to: "/ath", label: "ATH (atletismo)", icon: Timer, end: false },
  { to: "/arco", label: "ARC (tiro con arco)", icon: Target, end: false },
  { to: "/swm", label: "SWM (natación)", icon: Waves, end: false },
  { to: "/integrations", label: "Integraciones", icon: Cable, end: false },
  { to: "/settings", label: "Ajustes", icon: Settings, end: false },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const clear = useAuth((s) => s.clear);
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);
  const navigate = useNavigate();

  async function logout() {
    await clear();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-(--color-card)">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Swords className="size-5 text-(--color-primary)" />
          <span className="font-semibold">Integración GRS</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Navegación principal">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-(--color-primary) text-(--color-primary-foreground)"
                    : "text-(--color-muted-foreground) hover:bg-(--color-muted) hover:text-(--color-foreground)",
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium">{user?.name ?? "—"}</p>
            <p className="truncate text-xs text-(--color-muted-foreground)">
              @{user?.username ?? "—"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => toggleTheme()}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {theme === "dark" ? "Modo claro" : "Modo oscuro"}
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout}>
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
