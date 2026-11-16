import { describe, expect, it } from "vitest";

import { downloadName, fileSizeText, sentDateBR, unopened } from "./deliveries";

describe("Meus documentos: textos", () => {
  it("data de Brasília, tamanho com vírgula, novos e nome do arquivo", () => {
    expect(sentDateBR("2026-11-17T01:30:00Z")).toBe("16/11/2026");
    expect(fileSizeText(340 * 1024)).toBe("340 KB");
    expect(fileSizeText(1.25 * 1024 * 1024)).toBe("1,3 MB");
    expect(fileSizeText(null)).toBe("");
    expect(unopened([{ first_opened_at: null }, { first_opened_at: "2026-11-18T00:00:00Z" }, { first_opened_at: null }])).toBe(2);
    expect(downloadName({ title: "Treino · Ficha de teste (QA)", file_path: "p/1.pdf", mime_type: "application/pdf" })).toBe("treino-ficha-de-teste-qa.pdf");
    expect(downloadName({ title: "Exame", file_path: "p/1.PNG", mime_type: "image/png" })).toBe("exame.png");
  });
});
