import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
}));

const ensureMyProfile = vi.hoisted(() => vi.fn());
const requestPasswordReset = vi.hoisted(() => vi.fn());
const updatePassword = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  supabase: { auth },
}));

vi.mock("@/lib/api/ensureMyProfile", () => ({
  ensureMyProfile,
}));

vi.mock("@/lib/api/authPassword", () => ({
  requestPasswordReset,
  updatePassword,
}));

vi.mock("@/lib/observability/sentry", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { clear: vi.fn() },
}));

const { AuthProvider } = await import("./auth-provider");
const { useAuth } = await import("./auth-context");

function Probe() {
  const value = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(value.loading)}</span>
      <span data-testid="authed">{String(value.isAuthenticated)}</span>
      <span data-testid="recovery">{String(value.isPasswordRecovery)}</span>
      <button type="button" onClick={() => void value.signInWithGoogle()}>
        google
      </button>
      <button type="button" onClick={() => void value.signIn("a@b.com", "abcdefgh")}>
        login
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

beforeEach(() => {
  auth.getSession.mockReset();
  auth.onAuthStateChange.mockReset();
  auth.signInWithPassword.mockReset();
  auth.signInWithOAuth.mockReset();
  auth.signOut.mockReset();
  ensureMyProfile.mockReset();
  requestPasswordReset.mockReset();
  updatePassword.mockReset();
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
  auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
  ensureMyProfile.mockResolvedValue(undefined);
});

describe("AuthProvider — AUTH-EMAIL-03", () => {
  it("Google OAuth preserva redirect e signup_surface patient_app", async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    await act(async () => {
      screen.getByText("google").click();
    });
    expect(auth.signInWithOAuth).toHaveBeenCalledTimes(1);
    const payload = auth.signInWithOAuth.mock.calls[0]?.[0] as {
      provider: string;
      options: { redirectTo: string; queryParams: { signup_surface: string } };
    };
    expect(payload.provider).toBe("google");
    expect(payload.options.redirectTo).toMatch(/\/auth\/callback$/);
    expect(payload.options.queryParams).toEqual({ signup_surface: "patient_app" });
  });

  it("sessão inicial espera ensure_my_profile antes de liberar loading", async () => {
    let finishEnsure: (() => void) | undefined;
    ensureMyProfile.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishEnsure = resolve;
        }),
    );
    auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    });
    renderProvider();
    await waitFor(() => expect(ensureMyProfile).toHaveBeenCalledTimes(1));
    expect(ensureMyProfile).toHaveBeenCalledWith();
    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(screen.getByTestId("authed")).toHaveTextContent("false");
    await act(async () => {
      finishEnsure?.();
    });
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("authed")).toHaveTextContent("true");
  });

  it("TOKEN_REFRESHED não chama ensure de novo", async () => {
    let listener: ((event: string, session: unknown) => void) | undefined;
    auth.onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(ensureMyProfile).not.toHaveBeenCalled();
    await act(async () => {
      listener?.("TOKEN_REFRESHED", { user: { id: "u1" } });
    });
    expect(ensureMyProfile).not.toHaveBeenCalled();
  });

  it("signIn usa e-mail e senha, sem criar patient", async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    await act(async () => {
      screen.getByText("login").click();
    });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "abcdefgh" });
  });
});
