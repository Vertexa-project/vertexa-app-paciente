import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  supabase: { rpc },
}));

const { ensureMyProfile } = await import("./ensureMyProfile");

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: null, error: null });
});

describe("ensureMyProfile", () => {
  it("chama RPC zero-args, sem body de autoridade", async () => {
    await ensureMyProfile();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("ensure_my_profile");
    expect(rpc.mock.calls[0]?.[1]).toBeUndefined();
  });

  it("propaga erro do banco", async () => {
    const err = { message: "boom" };
    rpc.mockResolvedValue({ data: null, error: err });
    await expect(ensureMyProfile()).rejects.toEqual(err);
  });
});
