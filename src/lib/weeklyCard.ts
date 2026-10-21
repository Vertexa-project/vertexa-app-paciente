// Imagem do Resumo da semana para compartilhar (PDF do Ernâni, tela 17). Desenhada em <canvas> (sem dependência nova).
// Só números do próprio resumo: sem nome, sem foto, sem peso.
import { rangeLabel, type WeeklySummary } from "@/lib/weeklySummary";
import type { WeeklyNote } from "@/lib/weeklyNote";

/** Quebra o texto em linhas que cabem em `maxWidth` (medida injetada, para testar sem canvas). Palavra maior que a linha fica sozinha. */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measure(next) > maxWidth) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

const nf = (n: number) => n.toLocaleString("pt-BR");

/** Linhas de dados do cartão, na ordem em que aparecem. */
export function cardStats(s: WeeklySummary): { value: string; label: string }[] {
  return [
    { value: s.workoutsPlanned > 0 ? `${s.workoutsDone}/${s.workoutsPlanned}` : String(s.workoutsDone), label: s.workoutsPlanned > 0 ? "treinos concluídos" : "dias com treino" },
    { value: `${s.streak} ${s.streak === 1 ? "dia" : "dias"}`, label: "de sequência" },
    { value: s.mealsPct === null ? "—" : `${s.mealsPct}%`, label: s.mealsPct === null ? "sem plano alimentar" : "refeições registradas" },
    { value: nf(s.kcalTotal), label: "kcal estimadas" },
  ];
}

export function drawWeeklyCard(s: WeeklySummary, note: WeeklyNote): Promise<Blob | null> {
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  ctx.fillStyle = "#121214"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#FF6A1A"; ctx.fillRect(0, 0, W, 12);
  ctx.textBaseline = "top";
  ctx.fillStyle = "#FF6A1A"; ctx.font = "600 34px sans-serif"; ctx.fillText("VERTEXA", 80, 90);
  ctx.fillStyle = "#FFFFFF"; ctx.font = "700 72px sans-serif"; ctx.fillText("Resumo da semana", 80, 150);
  ctx.fillStyle = "#9A9AA3"; ctx.font = "400 36px sans-serif"; ctx.fillText(rangeLabel(s.rangeStart, s.rangeEnd), 80, 245);

  const stats = cardStats(s);
  stats.forEach((st, i) => {
    const x = 80 + (i % 2) * 450, y = 340 + Math.floor(i / 2) * 250;
    ctx.fillStyle = "#1E1E22"; ctx.fillRect(x, y, 420, 210);
    ctx.fillStyle = "#FF6A1A"; ctx.font = "700 76px sans-serif"; ctx.fillText(st.value, x + 36, y + 38);
    ctx.fillStyle = "#9A9AA3"; ctx.font = "400 34px sans-serif"; ctx.fillText(st.label, x + 36, y + 138);
  });

  ctx.fillStyle = "#1E1E22"; ctx.fillRect(80, 870, 920, 330);
  ctx.fillStyle = "#9A9AA3"; ctx.font = "600 28px sans-serif";
  ctx.fillText(note.source === "team" ? "RECADO DA EQUIPE" : "RECADO AUTOMÁTICO", 116, 902);
  ctx.fillStyle = "#FFFFFF"; ctx.font = "400 40px sans-serif";
  wrapLines(note.text, 850, (t) => ctx.measureText(t).width).slice(0, 5).forEach((line, i) => ctx.fillText(line, 116, 958 + i * 54));

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

export type ShareResult = "shared" | "downloaded" | "cancelled";

/** Compartilha pelo sistema quando há suporte a arquivos; senão baixa a imagem. */
export async function shareOrDownload(blob: Blob, filename: string): Promise<ShareResult> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title: "Meu resumo da semana" }); return "shared"; }
    catch (e) { if ((e as { name?: string }).name === "AbortError") return "cancelled"; /* cai no download */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
