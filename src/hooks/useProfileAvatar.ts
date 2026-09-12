import { useQuery } from "@tanstack/react-query";

import { getAvatarSignedUrl } from "@/lib/api/avatar";
import {
  AVATAR_SIGNED_URL_GC_MS,
  AVATAR_SIGNED_URL_REFETCH_MS,
  AVATAR_SIGNED_URL_STALE_MS,
} from "@/lib/avatar/constants";

export function useSignedAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["avatar", "signedUrl", path ?? "none"],
    queryFn: () => getAvatarSignedUrl(path as string),
    enabled: Boolean(path),
    staleTime: AVATAR_SIGNED_URL_STALE_MS,
    gcTime: AVATAR_SIGNED_URL_GC_MS,
    refetchInterval: AVATAR_SIGNED_URL_REFETCH_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });
}
