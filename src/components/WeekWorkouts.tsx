import { Play } from "lucide-react";
import type { Workout } from "@/data/workoutData";

// PDF do Ernâni (tela 20): a aba Treino mostra o treino de hoje com a ação principal e a ficha A–E
// da semana. Só dado real da ficha; "feito" por dia não existe na leitura, então não é afirmado.

/** Treino do dia: o do dia da semana atual; sem treino hoje (descanso), o primeiro da ficha. */
export function pickTodayWorkout(plan: Workout[], dow: number): { workout: Workout; isToday: boolean } | null {
  if (plan.length === 0) return null;
  const today = plan.find((w) => w.dayIndex === dow);
  return today ? { workout: today, isToday: true } : { workout: plan[0], isToday: false };
}

/** "5 exercícios · ~50 min" — a duração só aparece quando existe (nada de "0 min"). */
export function workoutMeta(w: Workout): string {
  const n = w.exercises.length;
  const parts = [`${n} ${n === 1 ? "exercício" : "exercícios"}`];
  if (w.estimatedMinutes > 0) parts.push(`~${w.estimatedMinutes} min`);
  return parts.join(" · ");
}

export default function WeekWorkouts({ plan, dow, onOpen, doneIds }: { plan: Workout[]; dow: number; onOpen: () => void; doneIds?: ReadonlySet<string> }) {
  const picked = pickTodayWorkout(plan, dow);
  if (!picked) return null;
  const { workout, isToday } = picked;
  const meta = workoutMeta(workout);
  return (
    <>
      <div className="rounded-2xl bg-card border border-primary/25 p-4" data-testid="today-workout">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          {isToday ? `Treino de hoje · ${workout.dayOfWeek}` : "Próximo treino"}
        </p>
        <p className="text-base font-display font-bold text-foreground mt-1">Treino {workout.letter} · {workout.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{meta}</p>
        <button onClick={onOpen} className="mt-3 w-full h-11 rounded-xl gradient-orange text-primary-foreground text-sm font-bold flex items-center justify-center gap-2">
          <Play size={14} /> Abrir treino
        </button>
      </div>
      <section aria-label="Ficha da semana" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground">Ficha da semana</h3>
          {doneIds && <span className="text-[11px] text-muted-foreground" data-testid="week-done-count">{plan.filter((w) => doneIds.has(w.id)).length} de {plan.length} feitos</span>}
        </div>
        {plan.map((w) => {
          const today = isToday && w.id === workout.id;
          return (
            <div key={w.id} className={`rounded-xl bg-card p-3 flex items-center gap-3 border ${today ? "border-primary/50" : "border-transparent"}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${today ? "gradient-orange text-primary-foreground" : "bg-muted text-foreground"}`}>
                {w.letter}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{w.name}</p>
                <p className="text-[11px] text-muted-foreground">{[w.dayOfWeek, workoutMeta(w)].filter(Boolean).join(" · ")}</p>
              </div>
              {doneIds?.has(w.id) ? (
                <span className="text-[10px] font-semibold text-success px-2 py-0.5 rounded-full bg-success/10">✓ feito</span>
              ) : today ? (
                <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10">hoje</span>
              ) : null}
            </div>
          );
        })}
      </section>
    </>
  );
}
