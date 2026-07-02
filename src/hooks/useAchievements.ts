import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAchievementsView, getMyPatientId } from "@/lib/api";
import type { AchievementView } from "@/lib/api";

/**
 * Carrega o catálogo de conquistas + o estado de unlock do paciente (demo: Mariana), na ordem do
 * catálogo. A invalidação pós-ação (queryKey ['achievements']) é disparada no eventSync.ts quando
 * o motor grava um unlock novo — espelha o padrão de useMuscleRecovery/useChannelMessages.
 *
 * `recent` = conquistas destravadas mais recentes (para o card "Conquistas recentes").
 */
export function useAchievements(recentLimit = 3) {
  const patientIdQuery = useQuery({
    queryKey: ["myPatientId"],
    queryFn: getMyPatientId,
    staleTime: Infinity,
  });
  const patientId = patientIdQuery.data ?? undefined;

  const query = useQuery<AchievementView[]>({
    queryKey: ["achievements", patientId],
    queryFn: getAchievementsView,
    enabled: !!patientId,
  });

  useEffect(() => {
    if (query.isError && import.meta.env.DEV) {
      console.warn("[VERTEXA useAchievements] failed to load achievements", query.error);
    }
  }, [query.isError, query.error]);

  const all = query.data ?? [];
  const unlocked = all.filter((a) => a.unlocked);
  const recent = unlocked
    .filter((a) => a.unlockedAt)
    // mais recente primeiro (unlockedAt ISO → comparação lexicográfica é cronológica)
    .sort((a, b) => (b.unlockedAt as string).localeCompare(a.unlockedAt as string))
    .slice(0, recentLimit);

  return {
    all,
    unlocked,
    recent,
    unlockedCount: unlocked.length,
    totalCount: all.length,
    isLoading: patientIdQuery.isLoading || query.isLoading,
    // Falha ao resolver o patients.id deixa a query de conquistas DESABILITADA (enabled:!!patientId),
    // então precisa entrar no isError explicitamente — senão vira um "0 de 0" enganoso em vez do erro.
    isError: query.isError || patientIdQuery.isError,
  };
}
