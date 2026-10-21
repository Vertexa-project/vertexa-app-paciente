import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import KcalBars from "@/components/KcalBars";
import { useWeeklySummary } from "@/hooks/useWeeklySummary";
import { rangeLabel } from "@/lib/weeklySummary";

const nf = (n: number) => n.toLocaleString("pt-BR");

export default function WeeklySummary() {
  const navigate = useNavigate();
  const { summary: s, isLoading, isError, refetch } = useWeeklySummary();
  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} aria-label="Voltar" className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Resumo da semana</h1>
            {s && <p className="text-[11px] text-muted-foreground">{rangeLabel(s.rangeStart, s.rangeEnd)} · {s.isClosed ? "semana fechada" : "em andamento"}</p>}
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 rounded-2xl bg-muted animate-pulse" />
        ) : isError || !s ? (
          <div className="bg-card rounded-2xl p-5 text-center border border-dashed border-red-500/30">
            <p className="text-xs text-red-400">Não foi possível carregar o resumo da semana.</p>
            <button onClick={refetch} className="mt-2 text-[11px] font-semibold text-primary">Tentar novamente</button>
          </div>
        ) : (
          <>
            <div className="mb-4" data-testid="weekly-kcal">
              <p className="text-4xl font-display font-bold text-foreground">{nf(s.kcalTotal)} <span className="text-sm font-normal text-muted-foreground">kcal estimadas</span></p>
              {s.kcalVsPrevPct !== null && (
                <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.kcalVsPrevPct >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {s.kcalVsPrevPct >= 0 ? "↑ +" : "↓ "}{s.kcalVsPrevPct}% vs. semana anterior
                </span>
              )}
            </div>

            <div className="bg-card rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-muted-foreground">Por dia</p>
                {s.kcalAvgPerDay !== null && <p className="text-[11px] text-muted-foreground">média <span className="font-semibold text-foreground">{nf(s.kcalAvgPerDay)}</span> kcal/dia</p>}
              </div>
              <KcalBars values={s.kcalByDay} todayIndex={todayIndex} />
              <p className="text-[10px] text-muted-foreground/70 mt-3">Estimativa a partir dos treinos concluídos e das atividades que você registrou. Não é gasto medido.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4" data-testid="weekly-cards">
              <div className="bg-card rounded-xl p-4">
                <p className="text-xl font-display font-bold text-primary">{s.workoutsPlanned > 0 ? `${s.workoutsDone}/${s.workoutsPlanned}` : s.workoutsDone}</p>
                <p className="text-[11px] text-muted-foreground">{s.workoutsPlanned > 0 ? "treinos concluídos" : "dias com treino"}</p>
              </div>
              <div className="bg-card rounded-xl p-4">
                <p className="text-xl font-display font-bold text-foreground">{s.streak} {s.streak === 1 ? "dia" : "dias"}</p>
                <p className="text-[11px] text-muted-foreground">de sequência</p>
              </div>
              <div className="bg-card rounded-xl p-4">
                <p className="text-xl font-display font-bold text-foreground">{s.vriDelta === null ? "VRI" : `VRI ${s.vriDelta > 0 ? "+" : ""}${s.vriDelta}`}</p>
                <p className="text-[11px] text-muted-foreground">{s.score !== null ? `${s.score} pontos` : "sem medição"}</p>
              </div>
              <div className="bg-card rounded-xl p-4">
                <p className="text-xl font-display font-bold text-foreground">{s.mealsPct === null ? "—" : `${s.mealsPct}%`}</p>
                <p className="text-[11px] text-muted-foreground">{s.mealsPct === null ? "sem plano alimentar" : "refeições registradas"}</p>
              </div>
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
