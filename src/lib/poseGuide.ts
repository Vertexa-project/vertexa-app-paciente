// Guia de pose (PDF do Ernâni, tela 05): "Frente · lado · costas com check" e "próxima sugerida". PURO.
// Série = as fotos de uma janela de 7 dias terminando hoje. Check = pose já fotografada na série atual.
// Fotos antigas sem posição não contam para nenhuma pose.
import { PHOTO_POSES, isPhotoPose, type PhotoPose } from "@/lib/photoPose";

export const SERIES_WINDOW_DAYS = 7;
const DAY_MS = 86_400_000;

export interface PoseShot { pose: string | null; taken_at: string }

export interface PoseSeries {
  done: Set<PhotoPose>;
  /** primeira pose (frente → lado → costas) ainda sem foto na série; null se a série está completa */
  next: PhotoPose | null;
  /** data da foto mais recente da última série (qualquer pose), para "Última série: 24 set" */
  lastShotAt: string | null;
}

export function poseSeries(shots: PoseShot[], now: Date): PoseSeries {
  const since = now.getTime() - SERIES_WINDOW_DAYS * DAY_MS;
  const done = new Set<PhotoPose>();
  for (const s of shots) {
    if (!isPhotoPose(s.pose)) continue;
    const t = new Date(s.taken_at).getTime();
    if (Number.isFinite(t) && t >= since && t <= now.getTime() + DAY_MS) done.add(s.pose);
  }
  const lastShotAt = shots.map((s) => s.taken_at).sort().at(-1) ?? null;
  const next = PHOTO_POSES.find((p) => !done.has(p)) ?? null;
  return { done, next, lastShotAt };
}

export const POSE_TIPS = ["Mesmo lugar, mesma luz, roupa parecida.", "Celular na altura do umbigo, a 2 metros."] as const;
