import { useId } from "react";

/**
 * Checkbox "Incluir sincronización de units" con su texto de advertencia.
 * Compartido entre el panel de ATH y la tarjeta del dashboard para que el
 * copy y el comportamiento no diverjan.
 */
export function ReconcileUnitsCheckbox({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-start gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-(--color-primary)"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        Incluir sincronización de units
        <span className="block text-xs text-(--color-muted-foreground)">
          Refleja ajustes del proveedor eliminando units huérfanas (cada 5 min). Borra
          datos: actívalo solo si confías en los cambios del programa.
        </span>
      </span>
    </label>
  );
}
