import { describe, expect, it } from "vitest";
import { buildNoteBody, canSendNote, findEducator, NOTE_MAX } from "./educatorNote";

const P = (profileId: string, disciplines: string[], type: never = null as never) => ({ profileId, disciplines, type });

describe("recado ao educador (PDF do Ernâni, tela 23)", () => {
  it("acha o educador pela disciplina; na falta, pelo tipo; senão ninguém", () => {
    expect(findEducator([P("n", ["nutricionista"]), P("e", ["educador_fisico"])])).toBe("e");
    expect(findEducator([P("n", ["nutricionista"]), P("t", [], "personal_trainer" as never)])).toBe("t");
    expect(findEducator([P("n", ["nutricionista"])])).toBeNull();
    expect(findEducator([])).toBeNull();
  });
  it("disciplina vence o tipo quando os dois existem em pessoas diferentes", () => {
    expect(findEducator([P("t", [], "personal_trainer" as never), P("e", ["educador_fisico"])])).toBe("e");
  });
  it("texto: identifica o treino e corta no limite", () => {
    expect(buildNoteBody("Treino E", "  senti o ombro ")).toBe("Recado sobre o Treino E: senti o ombro");
    expect(buildNoteBody("Treino E", "x".repeat(NOTE_MAX + 50)).length).toBe("Recado sobre o Treino E: ".length + NOTE_MAX);
  });
  it("só envia texto não vazio e dentro do limite", () => {
    expect(canSendNote("   ")).toBe(false);
    expect(canSendNote("ok")).toBe(true);
    expect(canSendNote("x".repeat(NOTE_MAX + 1))).toBe(false);
  });
});
