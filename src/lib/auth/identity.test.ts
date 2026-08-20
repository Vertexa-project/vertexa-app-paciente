import { describe, expect, it } from "vitest";

import { resolvePatientIdentity, type PatientRecord } from "./identity";

/**
 * Prova PURA do resolver. Sem sessão não há paciente. Sessão sem patient → pending.
 * Nenhum UUID de env entra na identidade.
 */

const SESSION = { userId: "auth-uid-123", email: "paciente@clinica.com" };
const PATIENT: PatientRecord = {
  profileId: "11111111-1111-1111-1111-111111111111",
  patientId: "22222222-2222-2222-2222-222222222222",
  displayName: "Helena Braga",
};
const FIXED_PIN = "00000000-0000-0000-0000-0000000000b1";

describe("resolvePatientIdentity — estados (nunca demo)", () => {
  it("loading → status 'loading' e nada resolvido", () => {
    const r = resolvePatientIdentity({
      loading: true,
      session: SESSION,
      patient: PATIENT,
    });
    expect(r.status).toBe("loading");
    expect(r.patientProfileId).toBeNull();
    expect(r.patientId).toBeNull();
  });

  it("sem sessão → 'anonymous', nenhum profile/paciente", () => {
    const r = resolvePatientIdentity({
      loading: false,
      session: null,
      patient: null,
    });
    expect(r.status).toBe("anonymous");
    expect(r.patientProfileId).toBeNull();
    expect(r.patientId).toBeNull();
    expect(r.patientProfileId).not.toBe(FIXED_PIN);
  });

  it("sessão + patient → 'active' com profile/patient do registro real", () => {
    const r = resolvePatientIdentity({
      loading: false,
      session: SESSION,
      patient: PATIENT,
    });
    expect(r.status).toBe("active");
    expect(r.patientProfileId).toBe(PATIENT.profileId);
    expect(r.patientId).toBe(PATIENT.patientId);
    expect(r.displayName).toBe("Helena Braga");
    expect(r.email).toBe(SESSION.email);
    expect(r.patientProfileId).not.toBe(FIXED_PIN);
  });

  it("sessão SEM patient → 'pending' (FAIL-CLOSED), nunca 'active' nem UUID fixo", () => {
    const r = resolvePatientIdentity({
      loading: false,
      session: SESSION,
      patient: null,
    });
    expect(r.status).toBe("pending");
    expect(r.patientProfileId).toBeNull();
    expect(r.patientId).toBeNull();
    expect(r.patientProfileId).not.toBe(FIXED_PIN);
  });

  it("displayName cai para o e-mail quando o patient não tem nome", () => {
    const r = resolvePatientIdentity({
      loading: false,
      session: SESSION,
      patient: { ...PATIENT, displayName: null },
    });
    expect(r.displayName).toBe(SESSION.email);
  });
});
