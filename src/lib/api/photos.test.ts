import { describe, it, expect } from "vitest";

import {
  validateProgressPhotoFile,
  ProgressPhotoValidationError,
  progressPhotoExt,
  progressPhotoStorageKey,
  resolveProgressPhotoDisplayUrl,
  MAX_PROGRESS_PHOTO_BYTES,
} from "./photos";

// Helper de arquivo mínimo (só os campos que a validação lê) — sem depender do File real do jsdom.
const fileLike = (type: string, size: number) => ({ type, size });

describe("validateProgressPhotoFile", () => {
  it("aceita JPG, PNG e WebP dentro do limite", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(() => validateProgressPhotoFile(fileLike(type, 1024))).not.toThrow();
    }
  });

  it("aceita exatamente no limite de tamanho", () => {
    expect(() => validateProgressPhotoFile(fileLike("image/png", MAX_PROGRESS_PHOTO_BYTES))).not.toThrow();
  });

  it("rejeita MIME fora da allowlist (pdf, gif, vazio)", () => {
    for (const type of ["application/pdf", "image/gif", "image/svg+xml", ""]) {
      expect(() => validateProgressPhotoFile(fileLike(type, 1024))).toThrow(ProgressPhotoValidationError);
    }
  });

  it("rejeita acima de 10 MB", () => {
    expect(() => validateProgressPhotoFile(fileLike("image/jpeg", MAX_PROGRESS_PHOTO_BYTES + 1))).toThrow(
      ProgressPhotoValidationError,
    );
  });
});

describe("progressPhotoExt", () => {
  it("mapeia MIME válido para a extensão canônica", () => {
    expect(progressPhotoExt("image/jpeg")).toBe("jpg");
    expect(progressPhotoExt("image/png")).toBe("png");
    expect(progressPhotoExt("image/webp")).toBe("webp");
  });

  it("MIME desconhecido cai em jpg", () => {
    expect(progressPhotoExt("image/tiff")).toBe("jpg");
  });
});

describe("progressPhotoStorageKey — coerência path↔policy (Parte 1)", () => {
  // patients.id do paciente logado; = private.current_patient_id() no banco.
  const patientId = "da000000-0000-0000-0000-000000000001";

  it("monta {patient_id}/{uuid}.ext com o patient_id como PRIMEIRA pasta", () => {
    const uuid = "11111111-2222-3333-4444-555555555555";
    const key = progressPhotoStorageKey(patientId, uuid, "jpg");
    expect(key).toBe(`${patientId}/${uuid}.jpg`);
    // A policy da Parte 1 escopa por (storage.foldername(name))[1] = patient_id.
    // private.storage_object_patient(name) extrai justamente split_part(name,'/',1).
    expect(key.split("/")[0]).toBe(patientId);
  });

  it("recusa patient_id vazio (fail-closed / ownership)", () => {
    expect(() => progressPhotoStorageKey("", "11111111-2222-3333-4444-555555555555", "jpg")).toThrow();
  });
});

describe("resolveProgressPhotoDisplayUrl — fallback legado", () => {
  it("sem storage_path retorna o photo_url legado (não toca no storage)", async () => {
    const url = await resolveProgressPhotoDisplayUrl({ storage_path: null, photo_url: "https://legacy.example/x.jpg" });
    expect(url).toBe("https://legacy.example/x.jpg");
  });
});
