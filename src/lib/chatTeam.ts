// Rótulos da EQUIPE no chat (WP-APP-3 itens 1 e 3).
//
// Tudo aqui é função pura sobre o que a RPC public.channel_professionals devolve
// (profile_id, full_name, type, specialty, disciplines). Nada de embed, nada de mock.
import type { ChannelProfessional, ProfessionalType } from "@/lib/api/types";

// Espelho de public.disciplines (code -> label), a mesma lista que o painel do profissional usa.
// Código fora da lista NÃO desaparece da tela: vira rótulo legível a partir do próprio code.
const DISCIPLINE_LABELS: Record<string, string> = {
  educador_fisico: "Educador Físico",
  fisioterapeuta: "Fisioterapeuta",
  medico: "Médico",
  nutricionista: "Nutricionista",
  outro: "Outro",
  psicologo: "Psicólogo",
};

// Último recurso, quando a RPC traz `type` mas nem disciplines nem specialty.
const TYPE_LABELS: Record<string, string> = {
  doctor: "Médico",
  nutritionist: "Nutricionista",
  physiotherapist: "Fisioterapeuta",
  personal_trainer: "Educador Físico",
  other: "Outro",
};

/**
 * Texto exibido quando a RPC não trouxe disciplina, especialidade nem tipo. É DELIBERADO que
 * exista: o bug que motivou este WP era a disciplina sumir da tela sem que nada indicasse falta.
 */
export const DISCIPLINE_NOT_INFORMED = "Disciplina não informada";

export function disciplineLabel(code: string): string {
  const known = DISCIPLINE_LABELS[code];
  if (known) return known;
  const humanized = code.replace(/_/g, " ").trim();
  return humanized ? humanized.charAt(0).toUpperCase() + humanized.slice(1) : code;
}

/**
 * Disciplina de um profissional, por precedência: disciplines (catálogo) > specialty > type.
 * Retorna null só quando a RPC não trouxe nenhuma das três — a tela mostra
 * DISCIPLINE_NOT_INFORMED nesse caso, nunca um espaço em branco.
 */
export function professionalDisciplineLabel(
  prof: Pick<ChannelProfessional, "disciplines" | "specialty" | "type">,
): string | null {
  const codes = (prof.disciplines ?? []).filter((c) => c.trim());
  if (codes.length > 0) return codes.map(disciplineLabel).join(" · ");

  const specialty = prof.specialty?.trim();
  if (specialty) return specialty;

  const type: ProfessionalType | null = prof.type;
  if (type) return TYPE_LABELS[type] ?? null;

  return null;
}

/**
 * Descreve o que a conversa É: quem a lê. Não é aviso de risco — é o rótulo do canal.
 * Ordem preservada (a RPC já devolve por full_name). Retorna null sem nomes.
 */
export function teamReadsLabel(names: string[]): string | null {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  if (clean.length === 1) return `${clean[0]} lê esta conversa`;
  const last = clean[clean.length - 1];
  return `${clean.slice(0, -1).join(", ")} e ${last} leem esta conversa`;
}
