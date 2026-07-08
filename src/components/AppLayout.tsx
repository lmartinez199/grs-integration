import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Swords, Hand, Timer, Target, Waves, PersonStanding, SlidersHorizontal, LogOut, Sun, Moon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth.store";
import { useTheme } from "@/stores/theme.store";
import { Button } from "@/components/ui/button";

// Nav agrupada: el panel arriba, los deportes en su bloque y la config al final.
const NAV_SECTIONS: {
  heading?: string;
  items: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }[];
}[] = [
  { items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }] },
  {
    heading: "Deportes",
    items: [
      { to: "/arena", label: "WRE (lucha)", icon: Swords },
      { to: "/judo", label: "JUD (judo)", icon: Hand },
      { to: "/ath", label: "ATH (atletismo)", icon: Timer },
      { to: "/arco", label: "ARC (tiro con arco)", icon: Target },
      { to: "/swm", label: "SWM (natación)", icon: Waves },
      { to: "/sporttech-gar", label: "GAR (artística)", icon: PersonStanding },
      { to: "/sporttech-gry", label: "GRY (rítmica)", icon: PersonStanding },
    ],
  },
  {
    heading: "Sistema",
    items: [{ to: "/config", label: "Configuración", icon: SlidersHorizontal }],
  },
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
          <img src="/win2tec.svg" alt="" className="size-6 rounded-md" />
          <span className="font-semibold">Integración GRS</span>
        </div>

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3" aria-label="Navegación principal">
          {NAV_SECTIONS.map((section, i) => (
            <div key={section.heading ?? i} className="flex flex-col gap-1">
              {section.heading && (
                <p className="px-3 pb-1 text-2xs font-semibold uppercase tracking-wider text-(--color-muted-foreground)">
                  {section.heading}
                </p>
              )}
              {section.items.map(({ to, label, icon: Icon, end }) => (
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
            </div>
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
