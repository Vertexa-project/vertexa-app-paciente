import { ArrowLeft, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getLatestAdherenceState, getAdherenceHistory, getMealAdherenceToday, getSupplementAdherenceToday,
  getPendingSummary, getMyWorkoutPlan,
} from "@/lib/api";
import BottomNav from "@/components/BottomNav";
import VriCurve from "@/components/VriCurve";
import { vriBand, vriComponents, weakestComponent, curvePoints } from "@/lib/vriBreakdown";

const BAND_LABEL = { baixa: "Abaixo de 50", media: "Entre 50 e 69", alta: "70 ou mais" } as const;

export default function VriDetail() {
  const navigate = useNavigate();
  const adherence = useQuery({ queryKey: ["adherence"], queryFn: getLatestAdherenceState });
  const history = useQuery({ queryKey: ["adherenceHistory"], queryFn: () => getAdherenceHistory(60) });
  const meals = useQuery({ queryKey: ["mealAdherenceToday"], queryFn: getMealAdherenceToday });
  const supps = useQuery({ queryKey: ["supplementAdherenceToday"], queryFn: getSupplementAdherenceToday });
  const pending = useQuery({ queryKey: ["pendingSummary"], queryFn: getPendingSummary });
  const plan = useQuery({ queryKey: ["workoutPlan"], queryFn: getMyWorkoutPlan });

  const state = adherence.data ?? null;
  const points = curvePoints(history.data ?? []);
  const components = state
    ? vriComponents({
        workoutDaysWeek: Math.round(state.weeklyCompletionRate / 20),
        weeklyCompletionRate: state.weeklyCompletionRate,
        hasWorkoutPlan: (plan.data?.length ?? 0) > 0,
        mealsDone: meals.data?.done ?? 0, mealsTotal: meals.data?.total ?? 0,
        suppTaken: supps.data?.taken ?? 0, suppTotal: supps.data?.total ?? 0,
        weightDaysAgo: pending.data?.weightDaysAgo ?? null, photoDaysAgo: pending.data?.photoDaysAgo ?? null,
      })
    : [];
  const weakest = weakestComponent(components);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} aria-label="Voltar" className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Índice VRI</h1>
            <p className="text-[11px] text-muted-foreground">Vertexa Retention Index</p>
          </div>
        </div>

        {adherence.isPending ? (
          <div className="h-48 rounded-2xl bg-muted animate-pulse" />
        ) : adherence.isError ? (
          <div className="bg-card rounded-2xl p-5 text-center border border-dashed border-red-500/30">
            <p className="text-xs text-red-400">Não foi possível carregar seu índice.</p>
            <button onClick={() => adherence.refetch()} className="mt-2 text-[11px] font-semibold text-primary">Tentar novamente</button>
          </div>
        ) : !state ? (
          <div className="bg-card rounded-2xl p-5 text-center">
            <p className="text-sm text-muted-foreground">Seu índice aparece depois dos seus primeiros registros.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-5" data-testid="vri-hero">
              <p className="text-6xl font-display font-bold text-foreground">{state.score}</p>
              <p className="text-xs text-muted-foreground">de 100</p>
              <div className="mt-2 flex gap-2">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{BAND_LABEL[vriBand(state.score)]}</span>
                {state.lastScoreChange !== 0 && (
                  <span className="px-3 py-1 rounded-full bg-muted text-[10px] font-semibold text-foreground">
                    {state.lastScoreChange > 0 ? "+" : ""}{state.lastScoreChange} desde a última medição
                  </span>
                )}
              </div>
            </div>

            <div className="bg-card rounded-2xl p-4 mb-4" data-testid="vri-curve">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-muted-foreground">Desde o início{points.length > 0 ? ` · ${points.length} ${points.length === 1 ? "medição" : "medições"}` : ""}</p>
                <p className="text-[10px] text-muted-foreground">linha tracejada: 70</p>
              </div>
              {history.isError ? <p className="text-xs text-red-400 py-4 text-center">Não foi possível carregar a curva.</p> : <VriCurve points={points} />}
            </div>

            <div className="bg-card rounded-2xl p-4 mb-4" data-testid="vri-components">
              <p className="text-[11px] text-muted-foreground mb-3">O que compõe seu VRI</p>
              <div className="flex flex-col gap-3.5">
                {components.map((c) => (
                  <div key={c.key}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{c.label}</span>
                      <span className="text-sm font-semibold text-foreground">{c.pct === null ? "—" : `${c.pct}%`}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                      <div className="h-full rounded-full gradient-orange" style={{ width: `${c.pct ?? 0}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{c.detail}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-4">Mostra o que você fez. O índice é calculado pela Vertexa a partir desses e de outros sinais, como a regularidade.</p>
            </div>

            {weakest && (
              <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 flex gap-3" data-testid="vri-tip">
                <Info size={18} className="text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-warning">{weakest.component.label} é o que mais puxa seu índice.</p>
                  <p className="text-xs text-foreground mt-0.5">{weakest.tip}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
