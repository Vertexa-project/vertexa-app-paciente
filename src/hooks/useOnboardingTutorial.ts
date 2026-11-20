import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getMyPatientTutorial, markPatientTutorialSeen } from "@/lib/api/onboardingTutorial";

const KEY = ["onboardingTutorial", "patient"] as const;

export function useMyOnboardingTutorial() {
  return useQuery({
    queryKey: KEY,
    queryFn: getMyPatientTutorial,
    staleTime: 10 * 60_000,
    retry: false,
  });
}

export function useMarkOnboardingTutorialSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markPatientTutorialSeen,
    onSuccess: () => {
      qc.setQueryData(KEY, (old: unknown) =>
        old && typeof old === "object" ? { ...(old as object), pending: false } : old,
      );
    },
  });
}
