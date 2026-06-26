// Geometria autoral das zonas musculares sobrepostas aos PNGs oficiais (écorché) +
// vocabulário PT e mapas status->token. Mapeamento ZONA -> grupo canônico (CONTRATO):
//   FRONT: shoulders, chest, biceps, forearms, abs, quadriceps
//   BACK:  traps, lats (Dorsais+Romboides), triceps, forearms, lower_back, glutes, hamstrings, calves
//
// S11.1: as zonas deixaram de ser ELIPSES genéricas e passaram a ser <path d="..."> que seguem o
// CONTORNO do músculo na arte. Cada face tem seu próprio viewBox no aspect-ratio do PNG, então
// <img object-contain> + <svg preserveAspectRatio="xMidYMid meet"> registram na MESMA caixa — o
// alinhamento é responsivo (coords no espaço do viewBox, nunca em px/top-left).
//
// ⚠️ Os paths são AUTORAIS (traçados sobre a arte com o modo debug ?debugbody=1) e podem precisar de
// refino fino. Bilaterais são traçados no lado x<50 e espelhados em x=50 (mesmo groupId).
import type { CanonicalMuscle, MuscleStatus } from "@/lib/api/types";

export type BodySide = "front" | "back";

// viewBox de cada face = aspect-ratio do PNG (Body_front 816x1456, Body_back 941x1672).
export const FACE_VIEWBOX: Record<BodySide, { w: number; h: number }> = {
  front: { w: 100, h: 178.4 },
  back: { w: 100, h: 177.7 },
};

export interface BodyZone {
  id: string; // único por face, ex.: "front-chest"
  muscle: CanonicalMuscle; // groupId canônico (consolida esquerda/direita)
  labelPt: string; // nome PT exibido no tooltip
  side: BodySide;
  /** Path ABSOLUTO (M/L/C/Q/Z) em coords do viewBox, traçado no contorno do músculo
   *  (lado x<50 nos bilaterais; espelhado em x=50 por resolveZonePaths). */
  path: string;
  /** Centro aproximado do músculo: alvo de toque canônico (testes) + origem da leve expansão do hit. */
  center: { x: number; y: number };
  /** Músculo bilateral -> reflete em x=50 e gera a 2ª metade abrindo o MESMO groupId. */
  mirror: boolean;
}

// ── FRONT (viewBox 100 x 178.4) — traçado no lado esquerdo/centro ──
const FRONT_ZONES: BodyZone[] = [
  {
    id: "front-shoulders", muscle: "shoulders", labelPt: "Ombros", side: "front", mirror: true,
    center: { x: 33.5, y: 49 },
    path: "M 40,44 C 35,42 30,43.5 28.5,48 C 27.8,51 29.5,54.5 33,56 C 35,56.8 37,54 38.5,50.5 C 39.5,48 40,46 40,44 Z",
  },
  {
    id: "front-chest", muscle: "chest", labelPt: "Peitoral", side: "front", mirror: true,
    center: { x: 44, y: 51 },
    path: "M 49,46 L 42,45 C 40,47 40,50.5 41,53.5 L 44,56 L 49,56.2 Z",
  },
  {
    id: "front-biceps", muscle: "biceps", labelPt: "Bíceps", side: "front", mirror: true,
    center: { x: 29.2, y: 60.4 },
    path: "M 31.0,57.2 C 28.0,57.4 26.3,58.8 26.3,60.8 C 26.3,63.1 28.5,65.6 30.8,65.1 C 32,64.6 32.4,62.2 32.3,59.7 C 32.2,58.1 31.6,57.4 31.0,57.2 Z",
  },
  {
    id: "front-forearms", muscle: "forearms", labelPt: "Antebraços", side: "front", mirror: true,
    center: { x: 24.8, y: 73.5 },
    path: "M 28,66 C 25,66 23,68 22,72 C 21,76 21.8,80 24,81.5 C 26,82.5 27,79 27.5,74 C 28,70 28.5,67.5 28,66 Z",
  },
  {
    id: "front-abs", muscle: "abs", labelPt: "Abdômen", side: "front", mirror: false,
    center: { x: 50, y: 68.5 },
    path: "M 45.5,57.5 L 54.5,57.5 L 54,72 C 53,78 51.5,81.5 50,82 C 48.5,81.5 47,78 46,72 Z",
  },
  {
    id: "front-quadriceps", muscle: "quadriceps", labelPt: "Quadríceps", side: "front", mirror: true,
    center: { x: 44.5, y: 104 },
    path: "M 49,88 L 41.5,90 C 39.5,96 39.5,110 42,119 L 46,122 C 48,116 49,100 49.5,90 Z",
  },
];

// ── BACK (viewBox 100 x 177.7) — traçado no lado esquerdo/centro ──
const BACK_ZONES: BodyZone[] = [
  {
    id: "back-traps", muscle: "traps", labelPt: "Trapézio", side: "back", mirror: true,
    center: { x: 46, y: 48 },
    path: "M 50,40 L 42,46 C 40.5,49 41,53 44,55.5 L 50,54.5 Z",
  },
  {
    id: "back-lats", muscle: "lats", labelPt: "Dorsais", side: "back", mirror: true,
    center: { x: 43, y: 62 },
    path: "M 47,55 L 38,57 C 36.5,61 37.5,67 41.5,70 L 47,67 Z",
  },
  {
    id: "back-triceps", muscle: "triceps", labelPt: "Tríceps", side: "back", mirror: true,
    center: { x: 30, y: 58.5 },
    path: "M 32.5,53 C 28.5,54 27,57.5 27.2,62 C 27.4,64.5 30,65.5 32,62.5 C 33.2,60 33.4,55.5 32.5,53 Z",
  },
  {
    id: "back-forearms", muscle: "forearms", labelPt: "Antebraços", side: "back", mirror: true,
    center: { x: 25, y: 73 },
    path: "M 28,65.5 C 24.5,67.5 22.5,72 22,77 C 21.8,80.5 24,81.5 26,79 C 28,75 28.8,69 28,65.5 Z",
  },
  {
    id: "back-lower_back", muscle: "lower_back", labelPt: "Lombar", side: "back", mirror: false,
    center: { x: 50, y: 67 },
    path: "M 48,61 L 52,61 L 51.5,71 C 51,73 50.5,73.5 50,73.5 C 49.5,73.5 49,73 48.5,71 Z",
  },
  {
    id: "back-glutes", muscle: "glutes", labelPt: "Glúteos", side: "back", mirror: true,
    center: { x: 45, y: 83 },
    path: "M 49.5,76 L 42.5,77.5 C 40,80 39.5,86 43,90 L 49.5,89 Z",
  },
  {
    id: "back-hamstrings", muscle: "hamstrings", labelPt: "Posteriores", side: "back", mirror: true,
    center: { x: 45.5, y: 107 },
    path: "M 49.5,92.5 L 42.5,94 C 41,100 41,114 44,121 L 48,120 C 49,112 49.8,100 49.8,93 Z",
  },
  {
    id: "back-calves", muscle: "calves", labelPt: "Panturrilha", side: "back", mirror: true,
    center: { x: 45, y: 139 },
    path: "M 48.5,129 L 43.5,130.5 C 41.5,134 41.5,144 44.5,150 L 48,147 C 49,141 49.2,133 48.5,129 Z",
  },
];

export const ZONES_BY_SIDE: Record<BodySide, BodyZone[]> = {
  front: FRONT_ZONES,
  back: BACK_ZONES,
};

/**
 * Espelha um path ABSOLUTO no eixo vertical x=axis (default 50).
 * Suporta M/L/C/Q/S/T (pares x,y -> x nos índices pares), H (todos x), V/Z (inalterados),
 * A (arco: inverte sweep-flag e espelha x final). Autoramos só M/L/C/Q/Z.
 */
export function mirrorPathX(d: string, axis = 50): string {
  const flipX = (x: number) => axis * 2 - x;
  const fmt = (n: number) => String(Number.isInteger(n) ? n : +n.toFixed(3));
  const segs: string[] = [];
  const re = /([MLCQSTHVAZ])([^MLCQSTHVAZ]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    const cmd = m[1];
    const trimmed = m[2].trim();
    const nums = trimmed.length ? trimmed.split(/[\s,]+/).map(Number) : [];
    const C = cmd.toUpperCase();
    if (C === "M" || C === "L" || C === "T" || C === "C" || C === "Q" || C === "S") {
      // todos os pares são (x,y); o x está sempre no índice par.
      for (let k = 0; k + 1 < nums.length; k += 2) nums[k] = flipX(nums[k]);
    } else if (C === "H") {
      for (let k = 0; k < nums.length; k++) nums[k] = flipX(nums[k]);
    } else if (C === "A") {
      // (rx ry rot large-arc sweep x y) por grupo de 7: inverte sweep e espelha x final.
      for (let k = 0; k + 7 <= nums.length; k += 7) {
        nums[k + 4] = nums[k + 4] ? 0 : 1;
        nums[k + 6] = flipX(nums[k + 6]);
      }
    }
    // V e Z: sem alteração de x.
    const body = nums.map(fmt).join(" ");
    segs.push(body ? `${cmd} ${body}` : cmd);
  }
  return segs.join(" ");
}

export interface ResolvedPath {
  d: string; // forma (visível e base do hit)
  center: { x: number; y: number };
}

/** Resolve a(s) instância(s) de uma zona: a original + o espelho (se bilateral). */
export function resolveZonePaths(zone: BodyZone): ResolvedPath[] {
  const out: ResolvedPath[] = [{ d: zone.path, center: zone.center }];
  if (zone.mirror) {
    out.push({ d: mirrorPathX(zone.path), center: { x: 100 - zone.center.x, y: zone.center.y } });
  }
  return out;
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
