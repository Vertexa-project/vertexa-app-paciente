import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BodyMapFace from "./BodyMapFace";

describe("BodyMapFace (body map oficial)", () => {
  it("pinta só os músculos com estado e deixa o resto sem cor", () => {
    const { container } = render(<BodyMapFace side="front" imgSrc="x.png" statusByMuscle={{ chest: "fatigued" }} onZoneTap={() => {}} />);
    const peito = container.querySelectorAll('g[data-muscle="peitoral"]');
    expect(peito).toHaveLength(2);
    peito.forEach((g) => { expect(g.getAttribute("data-status")).toBe("fatigued"); expect(g.querySelectorAll("path").length).toBe(4); });
    const abd = container.querySelector('g[data-muscle="abdomen"]')!;
    expect(abd.getAttribute("data-status")).toBe("neutral");
    expect(abd.querySelectorAll("path")).toHaveLength(1); // só a área de toque
  });
  it("grupos agregados herdam o estado (serrátil e oblíquos seguem o abdômen)", () => {
    const { container } = render(<BodyMapFace side="front" imgSrc="x.png" statusByMuscle={{ abs: "recovering" }} onZoneTap={() => {}} />);
    for (const k of ["serratil", "obliquo", "abdomen"]) expect(container.querySelector(`g[data-muscle="${k}"]`)!.getAttribute("data-status")).toBe("recovering");
  });
  it("toque devolve o grupo canônico, o nome oficial e a vista", () => {
    const tap = vi.fn();
    render(<BodyMapFace side="back" imgSrc="x.png" statusByMuscle={{}} onZoneTap={tap} />);
    fireEvent.click(screen.getByRole("button", { name: "Lombar (eretores): Sem estímulo" }));
    expect(tap).toHaveBeenCalledWith({ muscle: "lower_back", labelPt: "Lombar (eretores)", side: "back" });
  });
  it("mostra só os músculos da vista pedida", () => {
    const { container } = render(<BodyMapFace side="back" imgSrc="x.png" statusByMuscle={{}} onZoneTap={() => {}} />);
    expect(container.querySelector('g[data-muscle="peitoral"]')).toBeNull();
    expect(container.querySelector('g[data-muscle="latissimo"]')).not.toBeNull();
  });
});
