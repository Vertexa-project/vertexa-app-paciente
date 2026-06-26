import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMuscleRecovery, getMyPatientId } from "@/lib/api";
import type { MuscleRecoveryState } from "@/lib/api";

/**
 * Carrega as linhas reais de recuperação muscular do paciente (demo: Mariana).
 * Resolve o patients.id e busca muscle_recovery_states via api/. A invalidação pós-treino
 * é disparada em eventSync.ts (queryKey ['recovery']) — espelha o padrão de useChannelMessages.
 *
 * O componente DERIVA o status exibido de last_trained_at (recoveryRule.ts); a coluna `status`
 * persistida é provisória e não é a fonte de verdade da cor.
 */
export function useMuscleRecovery() {
  const patientIdQuery = useQuery({
    queryKey: ["myPatientId"],
    queryFn: getMyPatientId,
    staleTime: Infinity,
  });
  const patientId = patientIdQuery.data ?? undefined;

  const query = useQuery<MuscleRecoveryState[]>({
    queryKey: ["recovery", patientId],
    queryFn: () => getMuscleRecovery(patientId as string),
    enabled: !!patientId,
  });

  useEffect(() => {
    if (query.isError && import.meta.env.DEV) {
      console.warn("[VERTEXA useMuscleRecovery] failed to load recovery", query.error);
    }
  }, [query.isError, query.error]);

  return {
    rows: query.data ?? [],
    isLoading: patientIdQuery.isLoading || query.isLoading,
    isError: query.isError,
  };
}
