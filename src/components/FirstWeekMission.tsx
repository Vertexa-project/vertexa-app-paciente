import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2, Rocket } from "lucide-react";

import MissionCelebration from "@/components/MissionCelebration";
import { getMyMission, logRoutineEntry, markMissionCelebrated, uploadRoutinePhoto } from "@/lib/api/routine";
import { ProgressPhotoValidationError } from "@/lib/api/photos";
import { localDateKey } from "@/lib/pendingLogic";
import { dayMonth, missionProgressText, missionVisible, shouldCelebrateMission, stepRoute, type MissionStepView } from "@/lib/routineCards";

/** A5 — "Missão da 1ª semana": checklist com progresso (x de y); cada passo leva à tela de registro certa; "parabéns" ao concluir. */
export default function FirstWeekMission() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["myMission"], queryFn: getMyMission });
  const [celebrating, setCelebrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = useRef(false);
  const m = q.data;

  useEffect(() => {
    if (shown.current || !shouldCelebrateMission(m)) return;
    shown.current = true;
    setCelebrating(true);
    void markMissionCelebrated().catch(() => undefined); // o "parabéns" aparece uma vez só
  }, [m]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["myMission"] });
  const photo = useMutation({
    mutationFn: ({ key, file }: { key: "supplements_photo" | "bio_photo"; file: File }) => uploadRoutinePhoto(key, file),
    onSuccess: () => { setError(null); void refresh(); },
    onError: (e) => setError(e instanceof ProgressPhotoValidationError ? e.message : "Não foi possível enviar a foto. Tente de novo."),
  });
  const noBio = useMutation({
    mutationFn: () => logRoutineEntry("bio_na"),
    onSuccess: () => { setError(null); void refresh(); },
    onError: () => setError("Não foi possível registrar. Tente de novo."),
  });

  if (!m || !missionVisible(m, localDateKey(new Date()))) return celebrating ? <MissionCelebration onClose={() => { setCelebrating(false); void refresh(); }} /> : null;

  const total = m.total ?? 0;
  const done = m.done_count ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const busy = photo.isPending || noBio.isPending;

  const action = (s: MissionStepView) => {
    const route = stepRoute(s.key);
    if (route) return <button type="button" onClick={() => navigate(route)} className="h-9 shrink-0 rounded-lg gradient-orange px-3 text-xs font-semibold text-primary-foreground">Fazer agora</button>;
    const key = s.key === "bio" ? "bio_photo" : "supplements_photo";
    return (
      <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
        <label className={`flex h-9 cursor-pointer items-center rounded-lg gradient-orange px-3 text-xs font-semibold text-primary-foreground ${busy ? "opacity-50" : ""}`}>
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : "Enviar foto"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} aria-label={`Enviar foto: ${s.label}`}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) photo.mutate({ key, file: f }); }} />
        </label>
        {s.key === "bio" && s.allow_skip ? <button type="button" disabled={busy} onClick={() => noBio.mutate()} className="h-9 rounded-lg bg-muted px-3 text-xs font-medium text-foreground disabled:opacity-50">Não tenho</button> : null}
      </div>
    );
  };

  return (
    <>
      <section aria-label="Missão da 1ª semana" data-testid="mission-first-week" className="mb-5 rounded-2xl border border-primary/40 bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Rocket size={20} className="text-primary" aria-hidden /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Missão da 1ª semana</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground" data-testid="mission-progress">
              {m.completed ? `Missão concluída em ${dayMonth(m.completed_on)}. Sua consulta está pronta!` : `${missionProgressText(m)} passos feitos${m.overdue ? ` · prazo era ${dayMonth(m.ends_on)}` : m.ends_on ? ` · até ${dayMonth(m.ends_on)}` : ""}`}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary-ink">{done}/{total}</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Progresso da missão">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        {!m.completed ? (
          <ul className="mt-3 space-y-2">
            {(m.steps ?? []).map((s) => (
              <li key={s.key} className="flex items-center gap-2.5 rounded-xl bg-muted/50 p-2.5">
                {s.done ? <CheckCircle2 size={18} className="shrink-0 text-success" aria-label="feito" /> : <Circle size={18} className="shrink-0 text-muted-foreground" aria-label="pendente" />}
                <p className={`min-w-0 flex-1 break-words text-[13px] ${s.done ? "text-muted-foreground line-through" : "font-medium text-foreground"}`}>{s.label}</p>
                {s.done ? null : action(s)}
              </li>
            ))}
          </ul>
        ) : null}
        {error ? <p role="alert" className="mt-2 text-[12px] text-destructive">{error}</p> : null}
      </section>
      {celebrating ? <MissionCelebration onClose={() => { setCelebrating(false); void refresh(); }} /> : null}
    </>
  );
}
