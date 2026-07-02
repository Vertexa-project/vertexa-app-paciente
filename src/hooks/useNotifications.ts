import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllNotificationsRead,
  getMyPatientId,
} from "@/lib/api";
import type { NotificationRow } from "@/lib/api";

/**
 * Contador de NÃO lidas — leve, só para o badge (não busca a lista inteira). Invalidado
 * quando markAsRead/markAll rodam (prefixo ['notifications']). Espelha useAchievements/useMuscleRecovery.
 */
export function useUnreadNotificationCount() {
  const patientIdQuery = useQuery({ queryKey: ["myPatientId"], queryFn: getMyPatientId, staleTime: Infinity });
  const patientId = patientIdQuery.data ?? undefined;

  const query = useQuery({
    queryKey: ["notifications", "unread", patientId],
    queryFn: getUnreadCount,
    enabled: !!patientId,
  });

  return { count: query.data ?? 0, isLoading: patientIdQuery.isLoading || query.isLoading };
}

/**
 * Lista de notificações + marcar como lida (persiste read_at). markRead invalida o prefixo
 * ['notifications'] -> a lista E o badge (useUnreadNotificationCount) atualizam juntos.
 */
export function useNotifications() {
  const queryClient = useQueryClient();
  const patientIdQuery = useQuery({ queryKey: ["myPatientId"], queryFn: getMyPatientId, staleTime: Infinity });
  const patientId = patientIdQuery.data ?? undefined;

  const query = useQuery<NotificationRow[]>({
    queryKey: ["notifications", "list", patientId],
    queryFn: getMyNotifications,
    enabled: !!patientId,
  });

  useEffect(() => {
    if (query.isError && import.meta.env.DEV) {
      console.warn("[VERTEXA useNotifications] failed to load notifications", query.error);
    }
  }, [query.isError, query.error]);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const markRead = useMutation({ mutationFn: (id: string) => markAsRead(id), onSuccess: invalidate });
  const markAllRead = useMutation({ mutationFn: () => markAllNotificationsRead(), onSuccess: invalidate });

  const notifications = query.data ?? [];
  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read_at).length,
    isLoading: patientIdQuery.isLoading || query.isLoading,
    isError: query.isError || patientIdQuery.isError,
    markRead: (id: string) => markRead.mutate(id),
    markAllRead: () => markAllRead.mutate(),
  };
}
