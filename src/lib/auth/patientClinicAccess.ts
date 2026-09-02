/**
 * Acesso do paciente à clínica (PLATFORM-02).
 * UI não é autoridade: o backend já nega dado clínico quando suspended.
 * Aqui só decidimos qual tela mostrar.
 */

export type PatientClinicAccess = "loading" | "ok" | "clinic-suspended" | "none" | "unknown";

export type PatientClinicAccessState = {
  accessState: "operational" | "clinic_suspended" | "none" | string;
  clinicStatus: string | null;
};

export function resolvePatientClinicAccess(input: {
  state: PatientClinicAccessState | undefined;
  isLoading: boolean;
  isError: boolean;
}): PatientClinicAccess {
  if (input.isLoading) return "loading";
  if (input.isError) return "unknown";
  if (!input.state) return "unknown";
  if (input.state.accessState === "operational") return "ok";
  if (input.state.accessState === "clinic_suspended") return "clinic-suspended";
  if (input.state.accessState === "none") return "none";
  return "unknown";
}
