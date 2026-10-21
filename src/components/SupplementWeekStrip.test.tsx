import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WeekAdherenceCard, WeekStrip } from "./SupplementWeekStrip";
import { supplementWeek } from "@/lib/supplementWeek";

const TODAY = new Date(2026, 9, 21, 15, 0);
const list = [{ id: "a", created_at: new Date(2026, 8, 1).toISOString() }];

describe("cartão e linha da semana (tela 24)", () => {
  it("mostra 'Adesão da semana' com 12/14 e 86%", () => {
    const days = ["2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21"];
    const intakes = days.map((d) => ({ supplement_id: "a", taken_on: d }));
    const w = supplementWeek([...list, { id: "b", created_at: list[0].created_at }], [...intakes, ...days.slice(0, 5).map((d) => ({ supplement_id: "b", taken_on: d }))], TODAY);
    render(<WeekAdherenceCard week={w} />);
    expect(screen.getByText("12/14")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Adesão da semana" })).toHaveAttribute("aria-valuenow", "86");
  });
  it("sem nada esperado o cartão não aparece", () => {
    const { container } = render(<WeekAdherenceCard week={supplementWeek([], [], TODAY)} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("a linha distingue tomado, não tomado e inexistente", () => {
    const w = supplementWeek([{ id: "n", created_at: new Date(2026, 9, 19).toISOString() }], [{ supplement_id: "n", taken_on: "2026-10-21" }], TODAY);
    render(<WeekStrip flags={w.perSupplement.n} days={w.days} name="Creatina" />);
    const cells = screen.getByRole("group", { name: "Semana de Creatina" }).querySelectorAll("[data-state]");
    expect([...cells].map((c) => c.getAttribute("data-state"))).toEqual(["none", "none", "none", "none", "missed", "missed", "taken"]);
  });
});
