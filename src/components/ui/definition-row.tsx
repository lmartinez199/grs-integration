/** Fila etiqueta→valor dentro de un <dl>. */
export function DefinitionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[var(--color-muted-foreground)]">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
