import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ supabase: { rpc } }));

const { saveAvatarPick, saveAvatarKind } = await import("./avatarPick");

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ error: null });
});

describe("saveAvatarPick", () => {
  it("chama set_my_avatar_pick com bichinho e cor normalizados", async () => {
    await saveAvatarPick("tigre", "#ffede8");
    expect(rpc).toHaveBeenCalledWith("set_my_avatar_pick", { p_key: "tigre", p_bg: "#FFEDE8" });
  });
  it("valor fora da lista não chega ao banco", async () => {
    await expect(saveAvatarPick("dragao", "#E6F6EE")).rejects.toThrow(/lista/);
    await expect(saveAvatarPick("tigre", "#000000")).rejects.toThrow(/lista/);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("erro do banco vira mensagem em português, sem vazar detalhe", async () => {
    rpc.mockResolvedValue({ error: { message: "42501 secret detail" } });
    await expect(saveAvatarPick("sapo", "#F2F2F0")).rejects.toThrow("Não foi possível salvar o avatar. Tente novamente.");
  });
});

describe("saveAvatarKind", () => {
  it("chama set_my_avatar_kind", async () => {
    await saveAvatarKind("photo");
    expect(rpc).toHaveBeenCalledWith("set_my_avatar_kind", { p_kind: "photo" });
  });
});
