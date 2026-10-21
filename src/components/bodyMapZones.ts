// Vocabulário PT e mapas status->token do mapa de recuperação. A geometria dos músculos vem do
// pacote oficial do body map (components/officialMuscles.ts, gerado do SVG oficial).
import type { MuscleStatus } from "@/lib/api/types";
import type { BodySide } from "@/components/officialMuscles";

export type { BodySide };

/** O que o painel precisa saber do músculo tocado. */
export interface BodyZone {
  muscle: import("@/lib/api/types").CanonicalMuscle;
  labelPt: string;
  side: BodySide;
}

// Status -> classes Tailwind (literais p/ o scanner do Tailwind não purgar).
export const RECOVERY_FILL: Record<MuscleStatus, string> = {
  fatigued: "fill-recovery-fatigued",
  recovering: "fill-recovery-recovering",
  recovered: "fill-recovery-recovered",
  weakened: "fill-recovery-weakened",
  neutral: "fill-recovery-neutral",
};

export const RECOVERY_STROKE: Record<MuscleStatus, string> = {
  fatigued: "stroke-recovery-fatigued",
  recovering: "stroke-recovery-recovering",
  recovered: "stroke-recovery-recovered",
  weakened: "stroke-recovery-weakened",
  neutral: "stroke-recovery-neutral",
};

export const RECOVERY_DOT: Record<MuscleStatus, string> = {
  fatigued: "bg-recovery-fatigued",
  recovering: "bg-recovery-recovering",
  recovered: "bg-recovery-recovered",
  weakened: "bg-recovery-weakened",
  neutral: "bg-recovery-neutral",
};

export const RECOVERY_LABEL_PT: Record<MuscleStatus, string> = {
  fatigued: "Fadigado",
  recovering: "Em recuperação",
  recovered: "Recuperado",
  weakened: "Enfraquecido",
  neutral: "Sem estímulo",
};

// Ordem da legenda (faixa de dias crescente).
export const RECOVERY_LEGEND_ORDER: MuscleStatus[] = [
  "fatigued",
  "recovering",
  "recovered",
  "weakened",
  "neutral",
];

/** Cor de cada estado (tokens do tema); "neutral" não pinta o músculo (fica o PNG oficial). */
export const RECOVERY_COLOR: Record<Exclude<MuscleStatus, "neutral">, string> = {
  fatigued: "hsl(var(--recovery-fatigued))",
  recovering: "hsl(var(--recovery-recovering))",
  recovered: "hsl(var(--recovery-recovered))",
  weakened: "hsl(var(--recovery-weakened))",
};
