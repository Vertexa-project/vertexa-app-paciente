import { describe, expect, it } from "vitest";

import { resolvePatientClinicAccess } from "./patientClinicAccess";

describe("resolvePatientClinicAccess — gate do app (UI não é autoridade)", () => {
  it("carregando", () => {
    expect(
      resolvePatientClinicAccess({ state: undefined, isLoading: true, isError: false }),
    ).toBe("loading");
  });

  it("clínica operacional ⇒ ok", () => {
    expect(
      resolvePatientClinicAccess({
        state: { accessState: "operational", clinicStatus: "active" },
        isLoading: false,
        isError: false,
      }),
    ).toBe("ok");
  });

  it("S30 — clinic_suspended ⇒ clinic-suspended (não pending)", () => {
    expect(
      resolvePatientClinicAccess({
        state: { accessState: "clinic_suspended", clinicStatus: "suspended" },
        isLoading: false,
        isError: false,
      }),
    ).toBe("clinic-suspended");
  });

  it("none ⇒ none (não inventa pending nem suspended)", () => {
    expect(
      resolvePatientClinicAccess({
        state: { accessState: "none", clinicStatus: null },
        isLoading: false,
        isError: false,
      }),
    ).toBe("none");
  });

  it("erro ⇒ unknown (fail-closed: não monta dado clínico)", () => {
    expect(
      resolvePatientClinicAccess({ state: undefined, isLoading: false, isError: true }),
    ).toBe("unknown");
  });
});
