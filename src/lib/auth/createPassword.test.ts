import { describe, expect, it } from "vitest";

import {
  CREATE_PASSWORD_GENERIC_MESSAGE,
  CREATE_PASSWORD_LEAKED_MESSAGE,
  CREATE_PASSWORD_REAUTH_MESSAGE,
  classifyCreatePasswordError,
} from "./createPassword";
import { AUTH_RATE_LIMIT_MESSAGE } from "./authClientErrors";

describe("classifyCreatePasswordError", () => {
  it("mapeia rate limit, leaked, reauth e genérico sem internals", () => {
    expect(classifyCreatePasswordError({ status: 429 }).message).toBe(AUTH_RATE_LIMIT_MESSAGE);
    expect(classifyCreatePasswordError({ code: "weak_password", message: "leaked" }).message).toBe(
      CREATE_PASSWORD_LEAKED_MESSAGE,
    );
    expect(classifyCreatePasswordError({ code: "reauthentication_needed" }).message).toBe(
      CREATE_PASSWORD_REAUTH_MESSAGE,
    );
    expect(classifyCreatePasswordError({ message: "AuthApiError: unexpected" }).message).toBe(
      CREATE_PASSWORD_GENERIC_MESSAGE,
    );
  });
});
