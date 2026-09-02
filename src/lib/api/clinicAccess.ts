import { supabase } from "@/lib/supabase";

export type ClinicAccessStateValue = "operational" | "clinic_suspended" | "none";

export interface MyClinicAccessState {
  clinicId: string | null;
  clinicName: string | null;
  clinicStatus: string | null;
  accessState: ClinicAccessStateValue;
}

interface RawAccessRow {
  clinic_id: string | null;
  clinic_name: string | null;
  clinic_status: string | null;
  access_state: string | null;
}

function asAccessState(value: string | null): ClinicAccessStateValue {
  if (value === "operational" || value === "clinic_suspended" || value === "none") {
    return value;
  }
  return "none";
}

/** Estado operacional da clínica do chamador. Sem join_code, sem dado clínico. */
export async function getMyClinicAccessState(): Promise<MyClinicAccessState> {
  const { data, error } = await supabase.rpc("get_my_clinic_access_state");
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as RawAccessRow | null;
  if (!row) {
    return { clinicId: null, clinicName: null, clinicStatus: null, accessState: "none" };
  }
  return {
    clinicId: row.clinic_id,
    clinicName: row.clinic_name,
    clinicStatus: row.clinic_status,
    accessState: asAccessState(row.access_state),
  };
}
