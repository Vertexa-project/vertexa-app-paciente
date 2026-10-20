import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ data: null as null | Record<string, unknown> }));
vi.mock("@/hooks/useClinicBrand", () => ({ useClinicBrand: () => ({ data: state.data }) }));
const { default: ClinicBadge } = await import("./ClinicBadge");

const brand = (o: Record<string, unknown> = {}) => ({ clinicId: "c1", name: "Clínica Teste Hefesto", logoPath: null, color: null, logoUrl: null, ...o });
beforeEach(() => { state.data = null; });

describe("ClinicBadge (app)", () => {
  it("sem clínica resolvida não renderiza nada (não inventa nome)", () => {
    const { container } = render(<ClinicBadge />);
    expect(container.firstChild).toBeNull();
  });
  it("com logo: logo + nome da clínica + Vertexa como assinatura secundária", () => {
    state.data = brand({ logoUrl: "https://x/l.png" });
    render(<ClinicBadge />);
    expect((screen.getByAltText("Logo de Clínica Teste Hefesto") as HTMLImageElement).src).toBe("https://x/l.png");
    expect(screen.getByText("Clínica Teste Hefesto")).toBeTruthy();
    expect(screen.getByText(/via Vertexa/i)).toBeTruthy();
  });
  it("sem logo: iniciais na cor da marca", () => {
    state.data = brand({ color: "#112233" });
    render(<ClinicBadge />);
    expect(screen.getByText("CT").style.backgroundColor).toBe("rgb(17, 34, 51)");
  });
  it("logo quebrada volta para iniciais", () => {
    state.data = brand({ logoUrl: "https://x/q.png" });
    render(<ClinicBadge />);
    fireEvent.error(screen.getByAltText("Logo de Clínica Teste Hefesto"));
    expect(screen.getByText("CT")).toBeTruthy();
  });
  it("showSignature=false esconde a assinatura", () => {
    state.data = brand();
    render(<ClinicBadge showSignature={false} />);
    expect(screen.queryByText(/via Vertexa/i)).toBeNull();
  });
});
