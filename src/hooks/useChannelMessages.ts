import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getChannelMessages, subscribeToChannelMessages } from "@/lib/api";
import type { ChatMessageView } from "@/lib/api";

/**
 * Loads a channel's messages with react-query and keeps them fresh via Realtime.
 * Falls back to ~6s polling if the Realtime subscription does not connect.
 */
export function useChannelMessages(channelId: string | undefined) {
  const queryClient = useQueryClient();
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const query = useQuery<ChatMessageView[]>({
    queryKey: ["channelMessages", channelId],
    queryFn: () => getChannelMessages(channelId as string),
    enabled: !!channelId,
    // Fallback only while Realtime is not connected.
    refetchInterval: channelId && !realtimeConnected ? 6000 : false,
  });

  useEffect(() => {
    if (!channelId) return;

    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ["channelMessages", channelId] });

    const unsubscribe = subscribeToChannelMessages(channelId, {
      onInsert: invalidate,
      onStatus: (status) => {
        if (status === "SUBSCRIBED") setRealtimeConnected(true);
        else setRealtimeConnected(false);
      },
    });

    return () => {
      setRealtimeConnected(false);
      unsubscribe();
    };
  }, [channelId, queryClient]);

  return query;
}