import { describe, expect, it } from "vitest";

import { resolvePatientIdentity, type PatientRecord } from "./identity";

/**
 * Prova PURA do resolver de identidade do paciente. Cobre TODOS os estados e, em especial, os
 * dois invariantes de segurança do WP:
 *   1) modo real IGNORA o pin/currentPatient demo;
 *   2) sessão real SEM patient → 'pending' (FAIL-CLOSED), nunca 'active'/app.
 */

const DEMO_PIN = "00000000-0000-0000-0000-0000000000b1";
const SESSION = { userId: "auth-uid-123", email: "mariana@example.com" };
const PATIENT: PatientRecord = {
  profileId: "11111111-1111-1111-1111-111111111111",
  patientId: "22222222-2222-2222-2222-222222222222",
  displayName: "Mariana",
};

describe("resolvePatientIdentity — estados", () => {
  it("loading → status 'loading' e nada resolvido", () => {
    const r = resolvePatientIdentity({
      mode: "real",
      loading: true,
      demoProfileId: DEMO_PIN,
      session: SESSION,
      patient: PATIENT,
    });
    expect(r.status).toBe("loading");
    expect(r.patientProfileId).toBeNull();
    expect(r.patientId).toBeNull();
  });

  it("demo → status 'demo', patientProfileId = pin", () => {
    const r = resolvePatientIdentity({
      mode: "demo",
      loading: false,
      demoProfileId: DEMO_PIN,
      session: null,
      patient: null,
    });
    expect(r.status).toBe("demo");
    expect(r.patientProfileId).toBe(DEMO_PIN);
    expect(r.email).toBeNull();
  });

  it("real + sessão + patient → 'active' com profile/patient/displayName", () => {
    const r = resolvePatientIdentity({
      mode: "real",
      loading: false,
      demoProfileId: DEMO_PIN,
      session: SESSION,
      patient: PATIENT,
    });
    expect(r.status).toBe("active");
    expect(r.patientProfileId).toBe(PATIENT.profileId);
    expect(r.patientId).toBe(PATIENT.patientId);
    expect(r.displayName).toBe("Mariana");
    expect(r.email).toBe(SESSION.email);
  });

  it("real + sessão SEM patient → 'pending' (FAIL-CLOSED), nunca 'active'", () => {
    const r = resolvePatientIdentity({
      mode: "real",
      loading: false,
      demoProfileId: DEMO_PIN,
      session: SESSION,
      patient: null,
    });
    expect(r.status).toBe("pending");
    expect(r.patientProfileId).toBeNull(); // não expõe nenhum patient
    expect(r.patientId).toBeNull();
  });

  it("real SEM sessão → 'anonymous'", () => {
    const r = resolvePatientIdentity({
      mode: "real",
      loading: false,
      demoProfileId: DEMO_PIN,
      session: null,
      patient: null,
    });
    expect(r.status).toBe("anonymous");
    expect(r.patientProfileId).toBeNull();
  });

  it("displayName cai para o e-mail quando o patient não tem nome", () => {
    const r = resolvePatientIdentity({
      mode: "real",
      loading: false,
      demoProfileId: DEMO_PIN,
      session: SESSION,
      patient: { ...PATIENT, displayName: null },
    });
    expect(r.displayName).toBe(SESSION.email);
  });
});

describe("resolvePatientIdentity — invariante: modo real IGNORA o pin de demo", () => {
  it("real SEM sessão não vaza o pin (patientProfileId null, não o DEMO_PIN)", () => {
    const r = resolvePatientIdentity({
      mode: "real",
      loading: false,
      demoProfileId: DEMO_PIN,
      session: null,
      patient: null,
    });
    expect(r.patientProfileId).not.toBe(DEMO_PIN);
    expect(r.patientProfileId).toBeNull();
  });

  it("real + patient usa o profile do patient, NUNCA o pin de demo", () => {
    const r = resolvePatientIdentity({
      mode: "real",
      loading: false,
      demoProfileId: DEMO_PIN,
      session: SESSION,
      patient: PATIENT,
    });
    expect(r.patientProfileId).toBe(PATIENT.profileId);
    expect(r.patientProfileId).not.toBe(DEMO_PIN);
  });

  it("real 'pending' não cai para o pin de demo", () => {
    const r = resolvePatientIdentity({
      mode: "real",
      loading: false,
      demoProfileId: DEMO_PIN,
      session: SESSION,
      patient: null,
    });
    expect(r.patientProfileId).not.toBe(DEMO_PIN);
  });
});
