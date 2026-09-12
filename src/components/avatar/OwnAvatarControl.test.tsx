import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const removeMyAvatar = vi.hoisted(() => vi.fn());
const replaceMyAvatar = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/avatar", () => ({
  getAvatarSignedUrl: vi.fn(async () => "https://signed.example/avatar.webp"),
  getProfileAvatarFields: vi.fn(),
  removeMyAvatar,
  replaceMyAvatar,
}));

import { OwnAvatarControl } from "./OwnAvatarControl";

const PROFILE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";

function renderControl(path: string | null = null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <OwnAvatarControl profileId={PROFILE} name="Luana dos Santos Costa" avatarPath={path} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  removeMyAvatar.mockReset();
  replaceMyAvatar.mockReset();
  removeMyAvatar.mockResolvedValue(undefined);
});

describe("OwnAvatarControl (paciente)", () => {
  it("fallback de iniciais LC para Luana dos Santos Costa", () => {
    renderControl(null);
    expect(screen.getByText("LC")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remover foto" })).not.toBeInTheDocument();
  });

  it("recusa identidade de arquivo inválida (GIF)", async () => {
    renderControl(null);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const gif = new File([new Uint8Array([0x47, 0x49, 0x46])], "x.gif", { type: "image/gif" });
    fireEvent.change(input, { target: { files: [gif] } });
    expect(await screen.findByText(/Formato não suportado/)).toBeInTheDocument();
    expect(replaceMyAvatar).not.toHaveBeenCalled();
  });

  it("remove só a própria foto", async () => {
    renderControl(`${PROFILE}/${"ab".repeat(16)}.webp`);
    fireEvent.click(screen.getByRole("button", { name: "Remover foto" }));
    expect(removeMyAvatar).toHaveBeenCalledTimes(1);
  });
});
