import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ supabase: { rpc } }));
vi.mock("@/lib/api/avatar", () => ({
  getAvatarSignedUrl: vi.fn(async () => "https://signed.example/a.webp"),
  getProfileAvatarFields: vi.fn(),
  removeMyAvatar: vi.fn(),
  replaceMyAvatar: vi.fn(),
}));

const openTab = (name: string) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false });

import { ProfileAvatarSection } from "./ProfileAvatarSection";

function renderSection(p: Partial<React.ComponentProps<typeof ProfileAvatarSection>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ProfileAvatarSection
        profileId="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"
        name="Beatriz Souza"
        avatarPath={null}
        legacyUrl={null}
        kind={null}
        avatarKey={null}
        bg={null}
        {...p}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ error: null });
});

describe("ProfileAvatarSection", () => {
  it("duas abas: 'Minha foto' (padrão) e 'Avatar'", async () => {
    renderSection();
    expect(screen.getByRole("tab", { name: "Minha foto" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Alterar foto de perfil" })).toBeInTheDocument();
    openTab("Avatar");
    expect(await screen.findByText("Escolha um avatar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar avatar" })).toBeInTheDocument();
  });

  it("quem já escolheu avatar abre na aba Avatar e pode voltar à foto", async () => {
    renderSection({ kind: "avatar", avatarKey: "panda", bg: "#EAF0FD", avatarPath: "x/y.webp" });
    expect(screen.getByRole("tab", { name: "Avatar" })).toHaveAttribute("aria-selected", "true");
    openTab("Minha foto");
    fireEvent.click(await screen.findByRole("button", { name: "Usar minha foto no app" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_my_avatar_kind", { p_kind: "photo" }));
  });

  it("sem foto guardada não oferece 'Usar minha foto'", async () => {
    renderSection({ kind: "avatar", avatarKey: "panda", bg: "#EAF0FD" });
    openTab("Minha foto");
    expect(screen.queryByRole("button", { name: "Usar minha foto no app" })).toBeNull();
  });
});
