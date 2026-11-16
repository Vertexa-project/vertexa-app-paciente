import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/avatar", () => ({ getAvatarSignedUrl: vi.fn(async () => "https://signed.example/a.webp") }));

import { PatientAvatar } from "./PatientAvatar";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("PatientAvatar", () => {
  it("avatar escolhido: bichinho na cor de fundo", () => {
    wrap(<PatientAvatar name="Beatriz Souza" kind="avatar" avatarKey="coruja" bg="#FEF5DC" />);
    const el = screen.getByTestId("patient-avatar-pick");
    expect(el).toHaveAttribute("data-avatar-key", "coruja");
    expect(el.textContent).toBe("🦉");
    expect(el.style.backgroundColor).toBe("rgb(254, 245, 220)");
  });
  it("sem foto e sem avatar: iniciais", () => {
    wrap(<PatientAvatar name="Beatriz Souza" />);
    expect(screen.getByText("BS")).toBeInTheDocument();
    expect(screen.queryByTestId("patient-avatar-pick")).toBeNull();
  });
  it("kind=photo mesmo com avatar guardado: não mostra o bichinho", () => {
    wrap(<PatientAvatar name="Beatriz Souza" kind="photo" avatarKey="coruja" bg="#FEF5DC" avatarPath="x/y.webp" />);
    expect(screen.queryByTestId("patient-avatar-pick")).toBeNull();
  });
});
