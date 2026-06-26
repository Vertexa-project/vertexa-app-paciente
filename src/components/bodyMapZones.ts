// Geometria autoral das zonas musculares sobrepostas aos PNGs oficiais (écorché) +
// vocabulário PT e mapas status->token. Mapeamento ZONA -> grupo canônico (CONTRATO):
//   FRONT: shoulders, chest, biceps, forearms, abs, quadriceps
//   BACK:  traps, lats (Dorsais+Romboides), lower_back, triceps, glutes, hamstrings, calves (+ forearms 14ª)
//
// ⚠️ Alinhamento PNG<->SVG é AUTORAL (coordenadas estimadas sobre a arte) e pode precisar de
// ajuste fino no dispositivo. Cada face tem seu próprio viewBox no aspect-ratio do PNG, então
// <img object-contain> + <svg preserveAspectRatio="xMidYMid meet"> registram na mesma caixa.
import type { CanonicalMuscle, MuscleStatus } from "@/lib/api/types";

export type BodySide = "front" | "back";

// viewBox de cada face = aspect-ratio do PNG (Body_front 816x1456, Body_back 941x1672).
export const FACE_VIEWBOX: Record<BodySide, { w: number; h: number }> = {
  front: { w: 100, h: 178.4 },
  back: { w: 100, h: 177.7 },
};

interface ZoneBlob {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot?: number; // graus; ao espelhar vira -rot
}

export interface BodyZone {
  id: string; // único por face, ex.: "front-chest"
  muscle: CanonicalMuscle;
  labelPt: string; // nome PT exibido no tooltip
  side: BodySide;
  blobs: ZoneBlob[]; // autorado no lado esquerdo/centro
  mirror: boolean; // músculo bilateral -> reflete em x=50
}

const FRONT_ZONES: BodyZone[] = [
  { id: "front-shoulders", muscle: "shoulders", labelPt: "Ombros", side: "front", mirror: true, blobs: [{ cx: 34, cy: 45, rx: 6.5, ry: 5.5, rot: 14 }] },
  { id: "front-chest", muscle: "chest", labelPt: "Peitoral", side: "front", mirror: true, blobs: [{ cx: 41, cy: 52, rx: 7.5, ry: 5.5, rot: -8 }] },
  { id: "front-biceps", muscle: "biceps", labelPt: "Bíceps", side: "front", mirror: true, blobs: [{ cx: 27, cy: 57, rx: 4.8, ry: 8, rot: -4 }] },
  { id: "front-forearms", muscle: "forearms", labelPt: "Antebraços", side: "front", mirror: true, blobs: [{ cx: 22.5, cy: 72, rx: 4.2, ry: 9, rot: -3 }] },
  { id: "front-abs", muscle: "abs", labelPt: "Abdômen", side: "front", mirror: false, blobs: [{ cx: 50, cy: 69, rx: 6, ry: 12 }] },
  { id: "front-quadriceps", muscle: "quadriceps", labelPt: "Quadríceps", side: "front", mirror: true, blobs: [{ cx: 41, cy: 108, rx: 7.5, ry: 17, rot: 3 }] },
];

const BACK_ZONES: BodyZone[] = [
  { id: "back-traps", muscle: "traps", labelPt: "Trapézio", side: "back", mirror: true, blobs: [{ cx: 42, cy: 46, rx: 7, ry: 5, rot: 22 }] },
  { id: "back-lats", muscle: "lats", labelPt: "Dorsais", side: "back", mirror: true, blobs: [{ cx: 41, cy: 56, rx: 8, ry: 10, rot: 16 }] },
  { id: "back-triceps", muscle: "triceps", labelPt: "Tríceps", side: "back", mirror: true, blobs: [{ cx: 27, cy: 57, rx: 4.8, ry: 8, rot: 5 }] },
  { id: "back-forearms", muscle: "forearms", labelPt: "Antebraços", side: "back", mirror: true, blobs: [{ cx: 22.5, cy: 72, rx: 4.2, ry: 9, rot: 3 }] },
  { id: "back-lower_back", muscle: "lower_back", labelPt: "Lombar", side: "back", mirror: false, blobs: [{ cx: 50, cy: 64, rx: 5.5, ry: 5.5 }] },
  { id: "back-glutes", muscle: "glutes", labelPt: "Glúteos", side: "back", mirror: true, blobs: [{ cx: 42, cy: 82, rx: 7.5, ry: 7 }] },
  { id: "back-hamstrings", muscle: "hamstrings", labelPt: "Posteriores", side: "back", mirror: true, blobs: [{ cx: 41, cy: 110, rx: 7.5, ry: 16, rot: 2 }] },
  { id: "back-calves", muscle: "calves", labelPt: "Panturrilha", side: "back", mirror: true, blobs: [{ cx: 42, cy: 144, rx: 5.5, ry: 11 }] },
];

export const ZONES_BY_SIDE: Record<BodySide, BodyZone[]> = {
  front: FRONT_ZONES,
  back: BACK_ZONES,
};

/** Path 'd' de uma elipse eixo-alinhada (a rotação vai no transform do <path>). */
function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx},${cy} a ${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 ${-rx * 2},0 Z`;
}

export interface ResolvedBlob {
  d: string; // forma visível pintada
  hitD: string; // área de toque transparente (maior) p/ alvos confortáveis no mobile
  transform?: string;
}

// Padding (no espaço 0-100) que aumenta a área de toque além do desenho visível.
const HIT_PAD = 3;

/** Expande os blobs de uma zona (inclui o espelho em x=50 para músculos bilaterais). */
export function resolveZoneBlobs(zone: BodyZone): ResolvedBlob[] {
  const out: ResolvedBlob[] = [];
  for (const b of zone.blobs) {
    out.push({
      d: ellipsePath(b.cx, b.cy, b.rx, b.ry),
      hitD: ellipsePath(b.cx, b.cy, b.rx + HIT_PAD, b.ry + HIT_PAD),
      transform: b.rot ? `rotate(${b.rot} ${b.cx} ${b.cy})` : undefined,
    });
    if (zone.mirror) {
      const mcx = 100 - b.cx;
      out.push({
        d: ellipsePath(mcx, b.cy, b.rx, b.ry),
        hitD: ellipsePath(mcx, b.cy, b.rx + HIT_PAD, b.ry + HIT_PAD),
        transform: b.rot ? `rotate(${-b.rot} ${mcx} ${b.cy})` : undefined,
      });
    }
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
