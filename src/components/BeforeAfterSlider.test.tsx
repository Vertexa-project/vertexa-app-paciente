import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BeforeAfterSlider from "./BeforeAfterSlider";

const B = { url: "b.jpg", caption: "17 set · 117,5 kg", alt: "Foto antes" };
const A = { url: "a.jpg", caption: "24 set · 115,6 kg", alt: "Foto depois" };

describe("divisor antes/depois (PDF do Ernâni, tela 16)", () => {
  it("mostra as duas legendas com data e peso", () => {
    render(<BeforeAfterSlider before={B} after={A} />);
    expect(screen.getByText("17 set · 117,5 kg")).toBeInTheDocument();
    expect(screen.getByText("24 set · 115,6 kg")).toBeInTheDocument();
  });
  it("começa no meio e o controle move o divisor e o recorte do 'antes'", () => {
    render(<BeforeAfterSlider before={B} after={A} />);
    const range = screen.getByRole("slider", { name: "Divisor antes e depois" });
    expect(range).toHaveValue("50");
    expect(screen.getByTestId("ba-divider")).toHaveStyle({ left: "50%" });
    fireEvent.change(range, { target: { value: "80" } });
    expect(screen.getByTestId("ba-divider")).toHaveStyle({ left: "80%" });
    expect(screen.getByTestId("ba-before").style.clipPath).toBe("inset(0 20% 0 0)");
    expect(range).toHaveAttribute("aria-valuetext", "80% antes");
  });
  it("foto sem URL (assinatura expirada) não quebra", () => {
    render(<BeforeAfterSlider before={{ ...B, url: null }} after={{ ...A, url: null }} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });
});
