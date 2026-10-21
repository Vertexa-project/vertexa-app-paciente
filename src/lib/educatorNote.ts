// Recado ao educador físico ao concluir o treino (PDF do Ernâni, tela 23). PURO.
import type { ChannelProfessional } from "@/lib/api/types";

export const NOTE_MAX = 500;

/** Educador físico do canal: pela disciplina do catálogo ou, na falta, pelo tipo. Nenhum → null (vai para a equipe toda). */
export function findEducator(roster: Pick<ChannelProfessional, "profileId" | "disciplines" | "type">[]): string | null {
  const byDiscipline = roster.find((p) => (p.disciplines ?? []).includes("educador_fisico"));
  const found = byDiscipline ?? roster.find((p) => p.type === "personal_trainer");
  return found ? found.profileId : null;
}

export function buildNoteBody(workoutLabel: string, text: string): string {
  const t = text.trim().slice(0, NOTE_MAX);
  return `Recado sobre o ${workoutLabel}: ${t}`;
}

export function canSendNote(text: string): boolean {
  return text.trim().length > 0 && text.trim().length <= NOTE_MAX;
}
