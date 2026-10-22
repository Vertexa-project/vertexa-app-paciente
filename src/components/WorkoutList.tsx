import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { getDayColor, type Workout } from "@/data/workoutData";

/** Lista da ficha na aba Treino. Qualquer treino da semana pode ser aberto e feito; o de hoje só ganha destaque. */
export default function WorkoutList({ schedule, todayId, onOpen }: { schedule: Workout[]; todayId: string | undefined; onOpen: (w: Workout) => void }) {
  return (
    <>
      {todayId && (
        <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            <span className="text-xs font-semibold text-primary">Treino do dia</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Seu treino de hoje está em destaque. Você pode escolher qualquer treino da semana.</p>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {schedule.map((w) => {
          const isToday = w.id === todayId;
          return (
            <motion.button
              key={w.id}
              data-testid={`workout-${w.id}`}
              whileTap={{ scale: 0.98 }}
              onClick={() => onOpen(w)}
              className={`w-full text-left rounded-2xl p-4 flex items-center justify-between transition-all bg-card ${
                isToday ? "border border-primary/30 shadow-lg shadow-primary/5" : "border border-transparent"
              }`}
            >
              <div className="flex-1">
                <p className="text-base font-bold text-foreground">Treino {w.letter} — {w.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{w.exercises.length} exercícios • {w.estimatedMinutes} Min • {w.estimatedCalories} kcal</p>
                {!isToday && <p className="text-[10px] text-muted-foreground/60 mt-1">Programado para {w.dayOfWeek}</p>}
              </div>
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold text-white ${getDayColor(w.dayOfWeek)}`}>{w.dayOfWeek}</div>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}
