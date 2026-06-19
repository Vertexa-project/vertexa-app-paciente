// Dynamic daily welcome messages for the patient Home screen.
// Pure module: no network, no React, no side effects -- safe to unit-test directly.

// Message pools indexed by Date.getDay() (0 = Sunday ... 6 = Saturday).
// `[nome]` is a placeholder replaced by the first name at pick time; phrases
// without it are rendered as-is.
const POOLS: readonly (readonly string[])[] = [
  // 0 -- domingo
  [
    "Domingo de cuidado com você mesmo. Que semana incrível, [nome]!",
    "Última chance da semana — ou primeiro passo pra próxima. Você decide.",
    "Domingou com consciência. Amanhã começa tudo de novo — e você já tá pronto.",
  ],
  // 1 -- segunda
  [
    "A semana é sua. Vamos com tudo, [nome]!",
    "Segunda já chegou com você dentro do app. Isso já é vitória.",
    "Novo começo, mesma garra. Bora [nome]!",
  ],
  // 2 -- terça
  [
    "Você voltou. Isso é o que separa quem chega de quem desiste.",
    "Terça com treino é terça bem vivida, [nome]!",
    "Dois dias seguidos é hábito se formando. Você está no caminho certo.",
    "Terça com treino feito é semana que não tem como perder.",
    "Consistência não é talento, é escolha. E você escolheu certo.",
  ],
  // 3 -- quarta
  [
    "Metade da semana e você ainda está aqui. Isso tem nome: constância.",
    "Quarta-feira com [nome] presente. A semana já valeu!",
    "No meio do caminho tem você — e você não para.",
  ],
  // 4 -- quinta
  [
    "Falta pouco, [nome]. Não larga agora que tá quase.",
    "Quinta com treino feito é sexta mais leve. Bora!",
    "Você chegou até aqui. O fim de semana já consegue te ver.",
  ],
  // 5 -- sexta
  [
    "Sextou com tudo! Você foi incrível essa semana, [nome].",
    "Última ficha da semana. Finaliza com a sua cara.",
    "Sexta com treino é o melhor presente que você dá pra si mesmo.",
  ],
  // 6 -- sábado
  [
    "Final de semana não para quem é sério. Bora, [nome]!",
    "Sábado de treino? Isso é nível diferente. Você é diferente.",
    "Enquanto todo mundo descansa, você escolhe evoluir.",
  ],
];

const DAY_MS = 86400000;

/**
 * Picks the welcome phrase for a given day, deterministically.
 *
 * Stable per calendar day: the same phrase shows all day, changes the next day,
 * and different days of the same week land on different phrases. Seeded off the
 * local-day index -- NOT Math.random, which would re-roll on every render and
 * make the phrase flicker between re-renders.
 *
 * `[nome]` is replaced by the first word of `name`; phrases without it stay intact.
 */
export function pickWelcomeMessage(opts: { name?: string; date?: Date }): string {
  const date = opts.date ?? new Date();
  const seed = Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / DAY_MS);
  const pool = POOLS[date.getDay()];
  const phrase = pool[seed % pool.length];

  const first = (opts.name ?? "").trim().split(" ")[0];
  return phrase.replace(/\[nome\]/g, first);
}