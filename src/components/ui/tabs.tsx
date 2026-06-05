import type { KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}

/** IDs deterministas para enlazar cada tab con su panel (role="tabpanel"). */
export const tabTriggerId = (value: string) => `tab-${value}`;
export const tabPanelId = (value: string) => `tabpanel-${value}`;

/**
 * Tabs ligero y controlado. El padre maneja qué contenido renderizar y debe
 * envolver cada panel con `role="tabpanel"`, `id={tabPanelId(value)}` y
 * `aria-labelledby={tabTriggerId(value)}`.
 */
export function Tabs({ tabs, value, onChange, className, "aria-label": ariaLabel }: TabsProps) {
  const move = (e: KeyboardEvent, idx: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    const target = tabs[next];
    onChange(target.value);
    document.getElementById(tabTriggerId(target.value))?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-[var(--color-border)]",
        className,
      )}
    >
      {tabs.map((t, idx) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            id={tabTriggerId(t.value)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={tabPanelId(t.value)}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => move(e, idx)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
