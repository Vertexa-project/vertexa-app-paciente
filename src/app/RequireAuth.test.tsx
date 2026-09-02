import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import type { ResolvedPatientIdentity } from "@/lib/auth/identity";

const state = vi.hoisted(() => ({
  authLoading: false,
  session: { user: { id: "auth-1" } } as { user: { id: string } } | null,
  identity: { status: "active" } as unknown as ResolvedPatientIdentity,
}));

vi.mock("@/providers/auth-context", () => ({
  useAuth: () => ({ session: state.session, loading: state.authLoading }),
}));
vi.mock("@/hooks/useIdentity", () => ({
  useIdentity: () => state.identity,
}));
vi.mock("@/pages/PendingAccessScreen", () => ({
  PendingAccessScreen: () => <div data-testid="tela-pendente" />,
}));
vi.mock("@/pages/ClinicSuspendedScreen", () => ({
  ClinicSuspendedScreen: () => <div data-testid="tela-suspensa" />,
}));

const clinicState = vi.hoisted(() => ({
  data: { accessState: "operational", clinicStatus: "active" } as
    | { accessState: string; clinicStatus: string | null }
    | undefined,
  isLoading: false,
  isError: false,
}));

vi.mock("@/hooks/useClinicAccessState", () => ({
  useClinicAccessState: () => clinicState,
}));

const { RequireAuth } = await import("./RequireAuth");

function renderGuard() {
  return render(
    <MemoryRouter>
      <RequireAuth>
        <div data-testid="app">app</div>
      </RequireAuth>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  state.authLoading = false;
  state.session = { user: { id: "auth-1" } };
  state.identity = { status: "active" } as unknown as ResolvedPatientIdentity;
  clinicState.data = { accessState: "operational", clinicStatus: "active" };
  clinicState.isLoading = false;
  clinicState.isError = false;
});

describe("RequireAuth — sem identidade demo (WP-04B)", () => {
  it("sem sessão redireciona para login e não monta o app", () => {
    state.session = null;
    state.identity = { status: "anonymous" } as unknown as ResolvedPatientIdentity;
    renderGuard();
    expect(screen.queryByTestId("app")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tela-pendente")).not.toBeInTheDocument();
  });

  it("sessão + active monta o app", () => {
    renderGuard();
    expect(screen.getByTestId("app")).toBeInTheDocument();
  });

  it("sessão + pending mostra PendingAccess e não inventa paciente", () => {
    state.identity = { status: "pending" } as unknown as ResolvedPatientIdentity;
    renderGuard();
    expect(screen.getByTestId("tela-pendente")).toBeInTheDocument();
    expect(screen.queryByTestId("app")).not.toBeInTheDocument();
  });

  it("S30 — active + clínica suspensa mostra ClinicSuspended e não monta o app", () => {
    clinicState.data = { accessState: "clinic_suspended", clinicStatus: "suspended" };
    renderGuard();
    expect(screen.getByTestId("tela-suspensa")).toBeInTheDocument();
    expect(screen.queryByTestId("app")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tela-pendente")).not.toBeInTheDocument();
  });
});
