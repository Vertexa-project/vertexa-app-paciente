// Rótulos da EQUIPE no chat (WP-APP-3 itens 1 e 3).
//
// Tudo aqui é função pura sobre o que a RPC public.channel_professionals devolve
// (profile_id, full_name, type, specialty, disciplines). Nada de embed, nada de mock.
import type { ChannelProfessional, ChatMessageView, ProfessionalType } from "@/lib/api/types";

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

/** Índice profile_id -> profissional, a partir do resultado da RPC. */
export function professionalsByProfileId(
  professionals: ChannelProfessional[]
): Map<string, ChannelProfessional> {
  const map = new Map<string, ChannelProfessional>();
  for (const p of professionals) map.set(p.profileId, p);
  return map;
}

/** Como o autor de uma mensagem aparece na tela. */
export interface MessageAuthor {
  name: string;
  /** Disciplina/especialidade ao lado do nome. `null` quando não se sabe — e aí não se escreve nada. */
  discipline: string | null;
  /** Só para a cor e o ícone do avatar. `null` cai no estilo neutro. */
  type: ProfessionalType | null;
}

/**
 * O ÚNICO lugar que resolve autor de mensagem (WP-APP-5 item 2) — usado pela BOLHA e pela CITAÇÃO.
 * Se fossem dois, a mesma pessoa apareceria com dois nomes na mesma tela.
 *
 * PRECEDÊNCIA DO NOME: `senderName` (o embed de `profiles`, que para a paciente FUNCIONA — há um
 * ramo de `can_see_profile` para profissional com vínculo ativo a ela) > nome da RPC
 * `channel_professionals` > "Profissional". A RPC é a rede de segurança para o caso em que o
 * vínculo deixou de ser ativo depois que a mensagem foi enviada; ela não substitui o embed.
 *
 * DISCIPLINA E TIPO vêm SÓ da RPC: o embed `professionals(type, specialty)` que os trazia era
 * bloqueado pela RLS e devolvia vazio em 100% das mensagens.
 */
export function messageAuthor(
  msg: Pick<ChatMessageView, "isOwn" | "senderProfileId" | "senderName">,
  byProfileId: ReadonlyMap<string, ChannelProfessional>
): MessageAuthor {
  if (msg.isOwn) return { name: "Você", discipline: null, type: null };

  const prof = msg.senderProfileId ? byProfileId.get(msg.senderProfileId) ?? null : null;
  const embedded = msg.senderName?.trim();

  return {
    name: embedded || prof?.name || "Profissional",
    // DUAS ausências diferentes, e a distinção é o ponto:
    //   pessoa NA RPC sem nenhuma das três  -> DISCIPLINE_NOT_INFORMED (a falta é o fato, igual
    //                                          ao seletor de @);
    //   pessoa FORA da RPC                  -> null, e a bolha não escreve nada — aqui não se
    //                                          sabe, e afirmar "não informada" seria inventar.
    discipline: prof ? professionalDisciplineLabel(prof) ?? DISCIPLINE_NOT_INFORMED : null,
    type: prof?.type ?? null,
  };
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

/**
 * Papéis da equipe para o cabeçalho (PDF do Ernâni, tela 26): "Médico · Nutricionista · Educador Físico".
 * Disciplinas distintas, na ordem da RPC; quem não tem disciplina informada não entra (não se inventa papel).
 * Retorna null sem nenhum papel — o cabeçalho cai no texto de "quem lê esta conversa".
 */
export function teamRolesLabel(
  professionals: Pick<ChannelProfessional, "disciplines" | "specialty" | "type">[],
): string | null {
  const seen = new Set<string>();
  const roles: string[] = [];
  for (const p of professionals) {
    const label = professionalDisciplineLabel(p);
    if (!label) continue;
    for (const part of label.split(" · ")) {
      if (!seen.has(part)) { seen.add(part); roles.push(part); }
    }
  }
  return roles.length > 0 ? roles.join(" · ") : null;
}

/** Rótulos dos chips "Para:" (PDF do Ernâni, tela 26): o papel; se dois têm o mesmo papel, acrescenta o primeiro nome. */
export function recipientChips(
  professionals: Pick<ChannelProfessional, "profileId" | "name" | "disciplines" | "specialty" | "type">[],
): { profileId: string; label: string }[] {
  const roles = professionals.map((p) => professionalDisciplineLabel(p) ?? p.name);
  return professionals.map((p, i) => {
    const dup = roles.filter((r) => r === roles[i]).length > 1;
    const first = p.name.trim().split(/\s+/)[0] ?? p.name;
    return { profileId: p.profileId, label: dup ? `${roles[i]} · ${first}` : roles[i] };
  });
}

/** Quem pré-selecionar quando o chat é aberto de uma aba (ex.: Plano → nutricionista). null = Toda a equipe. */
export function presetRecipient(
  professionals: Pick<ChannelProfessional, "profileId" | "disciplines">[],
  discipline: string | null | undefined,
): string | null {
  if (!discipline) return null;
  return professionals.find((p) => (p.disciplines ?? []).includes(discipline))?.profileId ?? null;
}
