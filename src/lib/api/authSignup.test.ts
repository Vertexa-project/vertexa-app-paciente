import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signUp = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());
const captureException = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { signUp },
    from,
  },
}));

vi.mock("@/lib/observability/sentry", () => ({
  captureException,
}));

const { activateAccess } = await import("./authSignup");

beforeEach(() => {
  signUp.mockReset();
  from.mockReset();
  captureException.mockReset();
  signUp.mockResolvedValue({ data: { user: { id: "u1" }, session: null }, error: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("activateAccess", () => {
  it("chama signUp com surface patient_app e sem autoridade", async () => {
    vi.stubGlobal("location", { origin: "http://localhost:8080" });

    const result = await activateAccess({
      email: "ana@paciente.com",
      password: "abcdefgh",
      fullName: "Ana Costa",
    });

    expect(result).toEqual({ kind: "check_email" });
    expect(signUp).toHaveBeenCalledTimes(1);
    const payload = signUp.mock.calls[0]?.[0] as {
      options: { emailRedirectTo: string; data: Record<string, unknown> };
    };
    expect(payload.options.emailRedirectTo).toBe("http://localhost:8080/auth/callback");
    expect(payload.options.data).toEqual({ full_name: "Ana Costa", signup_surface: "patient_app" });
    expect(payload.options.data.role).toBeUndefined();
    expect(payload.options.data.patient_id).toBeUndefined();
    expect(payload.options.data.clinic_id).toBeUndefined();
    expect(from).not.toHaveBeenCalled();
  });

  it("duplicata vira o mesmo estado neutro", async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered", status: 422 },
    });
    await expect(
      activateAccess({ email: "ana@paciente.com", password: "abcdefgh", fullName: "Ana Costa" }),
    ).resolves.toEqual({ kind: "check_email" });
  });

  it("rate limit não vira check_email", async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { status: 429, code: "over_email_send_rate_limit", message: "email rate limit" },
    });
    await expect(
      activateAccess({ email: "ana@paciente.com", password: "abcdefgh", fullName: "Ana Costa" }),
    ).resolves.toEqual({ kind: "rate_limited" });
    expect(signUp).toHaveBeenCalledTimes(1);
  });
});
