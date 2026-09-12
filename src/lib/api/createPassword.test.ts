import { beforeEach, describe, expect, it, vi } from "vitest";

const updateUser = vi.hoisted(() => vi.fn());
const getUser = vi.hoisted(() => vi.fn());
const signUp = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { updateUser, getUser, signUp } },
}));

vi.mock("@/lib/observability/sentry", () => ({
  captureException: vi.fn(),
}));

const { createPasswordForCurrentUser } = await import("./createPassword");

beforeEach(() => {
  updateUser.mockReset();
  getUser.mockReset();
  signUp.mockReset();
  updateUser.mockResolvedValue({ data: { user: { id: "same-user" } }, error: null });
  getUser.mockResolvedValue({ data: { user: { id: "same-user" } }, error: null });
});

describe("createPasswordForCurrentUser", () => {
  it("updateUser só com password, nunca signUp", async () => {
    await createPasswordForCurrentUser("abcdefgh");
    expect(updateUser).toHaveBeenCalledWith({ password: "abcdefgh" });
    expect(Object.keys(updateUser.mock.calls[0]?.[0] ?? {})).toEqual(["password"]);
    expect(signUp).not.toHaveBeenCalled();
  });
});
