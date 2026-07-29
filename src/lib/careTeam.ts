// Rótulo do "Profissional responsável" no Perfil (WP-APP-4 item 2).
//
// UM LUGAR SÓ decide como a equipe vira texto — a regra é de exibição, não de dados, e por isso
// mora aqui (puro, testável) e não na tela. A fonte é `listMyCareTeam` (lib/api/chat.ts), que traz
// os profissionais com vínculo ATIVO e não-externo.

import type { ChannelProfessional } from "@/lib/api/types";

/**
 * Nome do profissional responsável, do jeito que a paciente lê.
 *
 * `null` quando NÃO HÁ NINGUÉM — e null aqui significa exatamente isso, nunca "não consegui
 * descobrir". Quem chama trata as duas ausências de forma diferente: falha de leitura não pode
 * virar "você não tem profissional", que é uma afirmação, e falsa.
 *
 * Com mais de um (a maioria das pacientes em produção tem 2), o rótulo NÃO escolhe um deles como
 * "o" responsável — isso seria inventar uma hierarquia que o banco não guarda. Mostra o primeiro
 * e diz quantos faltam. Nome vazio/só-espaço é descartado antes: melhor um a menos do que uma
 * linha em branco onde deveria haver alguém.
 */
export function careTeamLabel(team: ChannelProfessional[]): string | null {
  const names = team
    .map((p) => p.name?.trim())
    .filter((n): n is string => !!n);

  if (names.length === 0) return null;
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1}`;
}
