/** Fila etiqueta→valor dentro de un <dl>. */
export function DefinitionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="shrink-0 text-(--color-muted-foreground)">{label}</dt>
      {/* title: el valor puede truncarse en tarjetas angostas (URLs, UUIDs). */}
      <dd className="truncate font-medium" title={value}>
        {value}
      </dd>
    </div>
  );
}
