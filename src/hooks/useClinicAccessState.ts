import { useQuery } from "@tanstack/react-query";

import { getMyClinicAccessState } from "@/lib/api/clinicAccess";
import { captureException } from "@/lib/observability/sentry";

export function useClinicAccessState(enabled: boolean) {
  return useQuery({
    queryKey: ["identity", "clinicAccessState"],
    queryFn: async () => {
      try {
        return await getMyClinicAccessState();
      } catch (err) {
        captureException(err, { source: "auth", scope: "clinic-access-state" });
        throw err;
      }
    },
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}
