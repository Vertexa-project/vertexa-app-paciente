// Catálogo ÚNICO das modalidades de atividade complementar (fonte de verdade compartilhada
// entre LogActivity — onde o paciente escolhe/estima — e Progress — onde a atividade real é lida).
// `slug` é o valor CANÔNICO gravado em activity_sessions.modality (e no payload do marcador
// activity_events(activity_logged)). Manter em pt-BR minúsculo, alinhado ao comentário da migration
// 20260702120000_activity_sessions.sql: corrida|caminhada|ciclismo|natacao|jiujitsu|tenis|cardio|outra.

export interface ActivityModality {
  slug: string; // canônico, gravado no banco
  label: string; // rótulo pt-BR exibido
  icon: string; // emoji
  calPerMin: number; // estimativa de kcal/min (só p/ a estimativa visual do app)
}

export const ACTIVITY_MODALITIES: ActivityModality[] = [
  { slug: "corrida", label: "Corrida", icon: "🏃", calPerMin: 11 },
  { slug: "caminhada", label: "Caminhada", icon: "🚶", calPerMin: 5 },
  { slug: "ciclismo", label: "Ciclismo", icon: "🚴", calPerMin: 9 },
  { slug: "natacao", label: "Natação", icon: "🏊", calPerMin: 10 },
  { slug: "jiujitsu", label: "Jiu-Jitsu", icon: "🥋", calPerMin: 12 },
  { slug: "tenis", label: "Tênis", icon: "🎾", calPerMin: 8 },
  { slug: "cardio", label: "Cardio", icon: "❤️‍🔥", calPerMin: 9 },
  { slug: "outra", label: "Outra", icon: "⚡", calPerMin: 7 },
];

const BY_SLUG = new Map(ACTIVITY_MODALITIES.map((m) => [m.slug, m]));

/**
 * Metadados de uma modalidade pelo slug canônico. Fallback tolerante (nunca lança) para slugs
 * antigos/desconhecidos — assim o Progress renderiza algo mesmo se a web/versões futuras gravarem
 * uma modalidade fora deste catálogo.
 */
export function modalityBySlug(slug: string): ActivityModality {
  return BY_SLUG.get(slug) ?? { slug, label: "Atividade", icon: "⚡", calPerMin: 0 };
}
