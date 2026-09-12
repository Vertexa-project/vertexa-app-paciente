import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: auth },
}));

vi.mock("@/lib/observability/sentry", () => ({
  captureException: vi.fn(),
}));

const { AuthCallback } = await import("./AuthCallback");

function renderCallback() {
  return render(
    <MemoryRouter initialEntries={["/auth/callback"]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/home" element={<div data-testid="home" />} />
        <Route path="/login" element={<div data-testid="login" />} />
        <Route path="/auth/update-password" element={<div data-testid="update-password" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.getSession.mockReset();
  auth.onAuthStateChange.mockReset();
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  window.history.replaceState({}, "", "/auth/callback");
});

describe("AuthCallback", () => {
  it("sessão confirmada vai para /home", async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } }, error: null });
    renderCallback();
    expect(await screen.findByTestId("home")).toBeInTheDocument();
  });

  it("PASSWORD_RECOVERY vai para update-password, não /home", async () => {
    let listener: ((event: string, session: unknown) => void) | undefined;
    auth.onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    let resolveSession: ((value: { data: { session: null }; error: null }) => void) | undefined;
    auth.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
    );
    renderCallback();
    await waitFor(() => expect(listener).toBeTypeOf("function"));
    await act(async () => {
      listener?.("PASSWORD_RECOVERY", { user: { id: "u1" } });
    });
    expect(await screen.findByTestId("update-password")).toBeInTheDocument();
    await act(async () => {
      resolveSession?.({ data: { session: null }, error: null });
    });
    expect(screen.queryByTestId("home")).not.toBeInTheDocument();
    expect(screen.queryByTestId("login")).not.toBeInTheDocument();
  });
});
