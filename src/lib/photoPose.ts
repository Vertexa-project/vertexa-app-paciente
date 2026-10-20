// Posição das fotos de evolução (frente / lado / costas). PURO e testável.
// Espelha o módulo do web (vertexa-web-pro/src/lib/domain/photoPose.ts): comparar só faz sentido entre
// posições EQUIVALENTES (frente × frente).
export const PHOTO_POSES = ["front", "side", "back"] as const;
export type PhotoPose = (typeof PHOTO_POSES)[number];
export type PoseKey = PhotoPose | "none";

export const POSE_LABEL: Record<PoseKey, string> = {
  front: "Frente",
  side: "Lado",
  back: "Costas",
  none: "Sem posição",
};
export const POSE_ORDER: PoseKey[] = ["front", "side", "back", "none"];

export function isPhotoPose(v: unknown): v is PhotoPose {
  return typeof v === "string" && (PHOTO_POSES as readonly string[]).includes(v);
}

export interface PoseLike {
  taken_at: string | null;
  pose?: string | null;
}

export function poseKey(p: Pick<PoseLike, "pose">): PoseKey {
  return isPhotoPose(p.pose) ? p.pose : "none";
}

const time = (iso: string | null): number => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
};

/** Cópia ordenada da mais antiga para a mais recente (estável; sem data vai para o fim). */
export function sortAsc<T extends PoseLike>(list: readonly T[]): T[] {
  return list
    .map((p, i) => ({ p, i }))
    .sort((a, b) => time(a.p.taken_at) - time(b.p.taken_at) || a.i - b.i)
    .map((x) => x.p);
}

export function groupByPose<T extends PoseLike>(list: readonly T[]): Record<PoseKey, T[]> {
  const out: Record<PoseKey, T[]> = { front: [], side: [], back: [], none: [] };
  for (const p of sortAsc(list)) out[poseKey(p)].push(p);
  return out;
}

/** Posições em que já dá para comparar (2+ fotos), na ordem de exibição. */
export function comparablePoses<T extends PoseLike>(list: readonly T[]): PoseKey[] {
  const groups = groupByPose(list);
  return POSE_ORDER.filter((k) => groups[k].length >= 2);
}

/** Data curta dd/mm/aaaa (dia local do aparelho). */
export function dayLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
