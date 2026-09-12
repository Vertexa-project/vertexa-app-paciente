import { beforeEach, describe, expect, it, vi } from "vitest";

const storageUpload = vi.hoisted(() => vi.fn());
const storageRemove = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc,
    storage: {
      from: () => ({
        upload: storageUpload,
        remove: storageRemove,
        createSignedUrl: vi.fn(),
      }),
    },
  },
}));

const { replaceMyAvatar, removeMyAvatar } = await import("./avatar");

const PROFILE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
const OLD = `${PROFILE}/${"cd".repeat(16)}.webp`;

beforeEach(() => {
  storageUpload.mockReset();
  storageRemove.mockReset();
  rpc.mockReset();
  storageUpload.mockResolvedValue({ error: null });
  storageRemove.mockResolvedValue({ error: null });
  rpc.mockResolvedValue({ data: OLD, error: null });
});

describe("replaceMyAvatar (paciente)", () => {
  it("RPC sem profile_id/patient_id no body", async () => {
    await replaceMyAvatar({
      profileId: PROFILE,
      blob: new Blob([new Uint8Array([1])], { type: "image/webp" }),
      previousPath: OLD,
    });
    const [fn, args] = rpc.mock.calls[0] as [string, { p_path: string }];
    expect(fn).toBe("set_my_avatar");
    expect(args.p_path.startsWith(`${PROFILE}/`)).toBe(true);
    expect(JSON.stringify(args)).not.toMatch(/profile_id|patient_id|clinic_id/);
  });
});

describe("removeMyAvatar (paciente)", () => {
  it("não envia identidade no RPC", async () => {
    await removeMyAvatar();
    expect(rpc).toHaveBeenCalledWith("remove_my_avatar");
  });
});
