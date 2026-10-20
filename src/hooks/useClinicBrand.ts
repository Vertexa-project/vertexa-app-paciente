import { useQuery } from "@tanstack/react-query";

import { getMyClinicBrand } from "@/lib/api";

/** Marca (nome + logo + cor) da clínica do paciente. Falha/ausência → null (o app segue com a marca Vertexa). */
export const useClinicBrand = () =>
  useQuery({
    queryKey: ["clinicBrand", "mine"],
    queryFn: getMyClinicBrand,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
