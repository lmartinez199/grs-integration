import { MapPin, CalendarRange, Users } from "lucide-react";

import type { ArenaSportEvent } from "@/api/grs/arena";

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(iso?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return iso || "—";
  return dateFmt.format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function ColorSwatch({ label, bg, fg }: { label: string; bg?: string; fg?: string }) {
  if (!bg) return null;
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex size-6 items-center justify-center rounded border text-[10px] font-bold"
        style={{ backgroundColor: bg, color: fg ?? "#fff" }}
      >
        A
      </span>
      <span className="text-xs text-[var(--color-muted-foreground)]">{label}</span>
    </div>
  );
}

export function EventSummary({ event }: { event: ArenaSportEvent }) {
  const modalidad = event.isIndividualEvent
    ? "Individual"
    : event.isTeamEvent
      ? "Por equipos"
      : "—";
  const sede = event.address || event.addressLocality || "—";

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{event.name || event.fullName || "Evento"}</h3>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Fact icon={<MapPin className="size-4" aria-hidden />} label="Sede" value={sede} />
        <Fact
          icon={<CalendarRange className="size-4" aria-hidden />}
          label="Fechas"
          value={`${formatDate(event.startDate)} – ${formatDate(event.endDate)}`}
        />
        <Fact
          icon={<Users className="size-4" aria-hidden />}
          label="Modalidad"
          value={modalidad}
        />
      </dl>

      {(event.athlete1Color || event.athlete2Color) && (
        <div className="flex items-center gap-6">
          <ColorSwatch label="Atleta 1" bg={event.athlete1Color} fg={event.athlete1TextColor} />
          <ColorSwatch label="Atleta 2" bg={event.athlete2Color} fg={event.athlete2TextColor} />
        </div>
      )}
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-[var(--color-primary)]">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {label}
        </dt>
        <dd className="text-sm font-medium">{value}</dd>
      </div>
    </div>
  );
}
