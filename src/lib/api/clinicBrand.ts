import { supabase } from "@/lib/supabase";
import { logoPublicUrl, normalizeHexColor, type ClinicBrand } from "@/lib/clinicBrand";

interface BrandRow {
  clinic_id: string;
  clinic_name: string | null;
  logo_path: string | null;
  brand_color: string | null;
}

export interface MyClinicBrand extends ClinicBrand {
  logoUrl: string | null;
}

/** Marca da clínica do paciente (RPC get_my_clinic_brand). null = sem clínica ativa. */
export async function getMyClinicBrand(): Promise<MyClinicBrand | null> {
  const { data, error } = await supabase.rpc("get_my_clinic_brand");
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as BrandRow | null | undefined;
  if (!row?.clinic_id) return null;
  return {
    clinicId: row.clinic_id,
    name: row.clinic_name ?? "Sua clínica",
    logoPath: row.logo_path,
    color: normalizeHexColor(row.brand_color),
    logoUrl: logoPublicUrl(import.meta.env.VITE_SUPABASE_URL as string, row.logo_path),
  };
}
