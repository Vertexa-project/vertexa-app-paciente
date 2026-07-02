import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getJourneyData, getMyPatientId } from "@/lib/api";
import type { JourneyData } from "@/lib/api";

/**
 * Jornada VIVA da Mariana: start_date + conquistas (marcos) + streak/score/fase do snapshot real.
 * Só leitura (NÃO recomputa VRI). Espelha useAchievements/useMuscleRecovery.
 */
export function useJourney() {
  const patientIdQuery = useQuery({ queryKey: ["myPatientId"], queryFn: getMyPatientId, staleTime: Infinity });
  const patientId = patientIdQuery.data ?? undefined;

  const query = useQuery<JourneyData>({
    queryKey: ["journey", patientId],
    queryFn: getJourneyData,
    enabled: !!patientId,
  });

  useEffect(() => {
    if (query.isError && import.meta.env.DEV) {
      console.warn("[VERTEXA useJourney] failed to load journey", query.error);
    }
  }, [query.isError, query.error]);

  return {
    data: query.data,
    isLoading: patientIdQuery.isLoading || query.isLoading,
    isError: query.isError || patientIdQuery.isError,
  };
}
