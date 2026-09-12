import { describe, expect, it } from "vitest";

import {
  canDefinePasswordForCurrentIdentity,
  hasReportedEmailIdentity,
  oauthPasswordSetupCopy,
  resolvePasswordSetupUX,
} from "./authIdentities";

function user(input: {
  providers?: string[];
  identities?: string[];
  provider?: string;
} | null) {
  if (!input) return null;
  return {
    app_metadata: {
      provider: input.provider,
      providers: input.providers,
    },
    identities: input.identities?.map((provider) => ({ provider })),
  };
}

describe("AUTH-EMAIL-04A — provider semantics", () => {
  it("email e google+email → configurada; google/apple → unknown/define; vazio → conservador", () => {
    expect(resolvePasswordSetupUX(user({ providers: ["email"], identities: ["email"] }))).toBe(
      "reported_password_configured",
    );
    expect(
      resolvePasswordSetupUX(user({ providers: ["google", "email"], identities: ["google", "email"] })),
    ).toBe("reported_password_configured");
    expect(hasReportedEmailIdentity(user({ providers: ["google"], identities: ["google"] }))).toBe(false);
    expect(resolvePasswordSetupUX(user({ providers: ["google"], identities: ["google"] }))).toBe(
      "can_define_password",
    );
    expect(canDefinePasswordForCurrentIdentity(user({ providers: ["apple"] }))).toBe(true);
    expect(resolvePasswordSetupUX(user({ providers: [], identities: [] }))).toBe("unknown");
    expect(oauthPasswordSetupCopy(user({ providers: ["google"] })).toLowerCase()).not.toContain(
      "não possui senha",
    );
  });
});
