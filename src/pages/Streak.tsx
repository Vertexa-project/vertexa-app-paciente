import { ArrowLeft, Flame, Moon, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLatestAdherenceState, getActivityEventsSince, getRestDays } from "@/lib/api";
import BottomNav from "@/components/BottomNav";
import RestDayCard from "@/components/RestDayCard";
import { nextStreakMilestone, weekStates } from "@/lib/streakWeek";
import { weekDays, weekStart } from "@/lib/weeklySummary";

const LETTER = ["D", "S", "T", "Q", "Q", "S", "S"];

export default function Streak() {
  const navigate = useNavigate();
  const today = new Date();
  const days = weekDays(weekStart(today));
  const adherence = useQuery({ queryKey: ["adherence"], queryFn: getLatestAdherenceState });
  const events = useQuery({ queryKey: ["streakWeekEvents", days[0]], queryFn: () => getActivityEventsSince(weekStart(today)) });
  const rest = useQuery({ queryKey: ["restDaysWeek", days[0]], queryFn: () => getRestDays(days[0], days[6]) });

  const streak = adherence.data?.streak ?? 0;
  const states = events.data && rest.data ? weekStates(events.data, rest.data, today) : null;
  const next = nextStreakMilestone(streak);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} aria-label="Voltar" className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Sequência</h1>
            <p className="text-[11px] text-muted-foreground">Dias seguidos com registro no seu plano</p>
          </div>
        </div>

        {adherence.isPending ? (
          <div className="h-48 rounded-2xl bg-muted animate-pulse" />
        ) : adherence.isError ? (
          <p className="text-xs text-red-400 text-center py-8">Não foi possível carregar sua sequência.</p>
        ) : (
          <>
            <div className="flex flex-col items-center my-4" data-testid="streak-hero">
              <Flame size={72} className="text-primary" strokeWidth={1.5} />
              <p className="text-6xl font-display font-bold text-foreground leading-none mt-2">{streak}</p>
              <p className="text-xs text-muted-foreground mt-1">{streak === 1 ? "dia seguido" : "dias seguidos"}</p>
            </div>

            {states && (
              <div className="grid grid-cols-7 gap-1.5 mb-5" role="group" aria-label="Semana" data-testid="streak-week">
                {states.map(({ day, state }) => (
                  <div key={day} data-state={state}
                    className={`h-12 rounded-xl flex flex-col items-center justify-center text-[10px] font-semibold ${
                      state === "done" ? "bg-primary/15 text-primary" : state === "rest" ? "bg-muted text-muted-foreground" : state === "today" ? "border border-primary text-primary" : "bg-card text-muted-foreground/60"
                    }`}>
                    {state === "done" ? <Flame size={14} /> : state === "rest" ? <Moon size={14} /> : <span className="h-3.5" />}
                    {LETTER[new Date(`${day}T12:00:00`).getDay()]}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-card rounded-2xl p-4 mb-4 text-[11px] text-muted-foreground space-y-1" data-testid="streak-rule">
              <p><span className="font-semibold text-foreground">Dia cumprido</span> = qualquer registro seu do plano no dia (treino, refeição, suplemento, água, peso, foto…)</p>
              <p><span className="font-semibold text-foreground">Dia de descanso</span> marcado não quebra a sequência</p>
              <p><span className="font-semibold text-foreground">Abrir o app</span> não conta</p>
            </div>

            <RestDayCard />

            {next && (
              <div className="bg-card rounded-2xl p-4 mt-4 flex items-center gap-3" data-testid="streak-next">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"><Trophy size={18} className="text-primary" /></div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Próximo marco: {next.target} dias</p>
                  <p className="text-[11px] text-muted-foreground">faltam {next.remaining} {next.remaining === 1 ? "dia" : "dias"}</p>
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
