import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MutationFunction } from "@tanstack/react-query";

import { toast } from "@/components/ui/toast";

/**
 * Wraps useMutation con toast automático y opción de invalidar queries.
 *
 * - onSuccess: muestra toast.success(successMsg) e invalida las keys indicadas.
 * - onError:   muestra toast.error(e.message).
 * - onSuccess?: callback adicional para lógica extra (setState, etc.).
 *
 * Casos especiales (onSuccess condicional, toast con resultado):
 * seguir usando useMutation directamente.
 */
export function useMutationWithToast<TData = unknown, TVariables = void>({
  mutationFn,
  successMsg,
  invalidateKeys = [],
  onSuccess,
}: {
  mutationFn: MutationFunction<TData, TVariables>;
  successMsg: string;
  invalidateKeys?: unknown[][];
  onSuccess?: (data: TData) => void;
}) {
  const qc = useQueryClient();
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: (data) => {
      toast.success(successMsg);
      for (const key of invalidateKeys) {
        qc.invalidateQueries({ queryKey: key });
      }
      onSuccess?.(data);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
