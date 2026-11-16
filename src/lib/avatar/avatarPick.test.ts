import { describe, expect, it } from "vitest";

import { AVATAR_ANIMALS, AVATAR_BGS, normalizeAvatarPick, resolveAvatarView } from "./avatarPick";

describe("normalizeAvatarPick", () => {
  it("aceita os 8 bichinhos e as 5 cores (cor volta em maiúsculas)", () => {
    expect(AVATAR_ANIMALS).toHaveLength(8);
    expect(AVATAR_BGS).toHaveLength(5);
    for (const a of AVATAR_ANIMALS) for (const bg of AVATAR_BGS) expect(normalizeAvatarPick(a.key, bg)).toEqual({ key: a.key, bg });
    expect(normalizeAvatarPick("tigre", "#ffede8")).toEqual({ key: "tigre", bg: "#FFEDE8" });
  });
  it("recusa bichinho ou cor fora da lista, ou ausente", () => {
    expect(normalizeAvatarPick("dragao", "#E6F6EE")).toBeNull();
    expect(normalizeAvatarPick("tigre", "#123456")).toBeNull();
    expect(normalizeAvatarPick("tigre", null)).toBeNull();
    expect(normalizeAvatarPick(undefined, "#E6F6EE")).toBeNull();
  });
});

describe("resolveAvatarView", () => {
  const pick = { key: "panda", bg: "#EAF0FD" };
  it("kind=avatar mostra o avatar, mesmo havendo foto", () => {
    expect(resolveAvatarView({ kind: "avatar", ...pick, avatarPath: "x/y.webp" })).toMatchObject({ type: "avatar", key: "panda", emoji: "🐼" });
  });
  it("kind=photo mostra a foto; sem foto cai no avatar; sem nada, iniciais", () => {
    expect(resolveAvatarView({ kind: "photo", ...pick, avatarPath: "x/y.webp" })).toEqual({ type: "photo" });
    expect(resolveAvatarView({ kind: "photo", ...pick })).toMatchObject({ type: "avatar" });
    expect(resolveAvatarView({ kind: "photo" })).toEqual({ type: "initials" });
  });
  it("sem kind (conta antiga): foto se houver (inclui legado), senão iniciais", () => {
    expect(resolveAvatarView({ legacyUrl: "https://x/a.png" })).toEqual({ type: "photo" });
    expect(resolveAvatarView({})).toEqual({ type: "initials" });
  });
  it("kind=avatar com dado inválido não quebra", () => {
    expect(resolveAvatarView({ kind: "avatar", key: "dragao", bg: "#fff" })).toEqual({ type: "initials" });
    expect(resolveAvatarView({ kind: "avatar", key: "dragao", bg: "#fff", avatarPath: "p" })).toEqual({ type: "photo" });
  });
});
