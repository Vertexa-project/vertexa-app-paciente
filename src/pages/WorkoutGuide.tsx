import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, X, ChevronRight, Clock, Flame, Dumbbell, CheckCircle2, Timer, StickyNote, Trophy, Zap, Video, Camera, Upload, Sparkles, AlertCircle, ChevronDown, StretchHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { workoutSchedule, getDayColor, getWarmupForWorkout, getWarmupFocusLabel, type Workout, type Exercise, type WarmupExercise } from "@/data/workoutData";
import { useQuery } from "@tanstack/react-query";
import { getMyWorkoutPlan } from "@/lib/api";
import { tracker } from "@/lib/eventTracker";
import BottomNav from "@/components/BottomNav";

type Screen = "list" | "detail" | "warmup" | "warmup-done" | "execution" | "complete";

type AnalysisStatus = "idle" | "recording" | "uploading" | "analyzing" | "ready" | "error";

interface AnalysisResult {
  exerciseName: string;
  overallScore: number;
  status: "boa execução" | "atenção" | "precisa ajustar";
  summary: string;
  positives: string[];
  improvements: string[];
  recommendations: string[];
  corrections: { issue: string; fix: string; tag: string }[];
  finalNote: string;
}

const mockAnalysisResults: Record<string, AnalysisResult> = {
  default: {
    exerciseName: "",
    overallScore: 82,
    status: "boa execução",
    summary: "Boa amplitude e ritmo consistente. Alguns ajustes na fase excêntrica podem melhorar seus resultados.",
    positives: [
      "Boa amplitude do movimento",
      "Ritmo consistente entre repetições",
      "Postura estável durante a série",
    ],
    improvements: [
      "Controlar melhor a fase de descida",
      "Manter cotovelos mais alinhados",
      "Reduzir leve balanço do tronco",
    ],
    recommendations: [
      "Mantenha o abdômen contraído durante todo o movimento",
      "Desça de forma mais controlada (2-3 segundos)",
      "Segure 1 segundo no pico da contração",
    ],
    corrections: [
      { issue: "Fase excêntrica rápida", fix: "Desça de forma controlada contando 2 a 3 segundos na descida. Sinta o músculo alongar durante todo o trajeto.", tag: "ritmo" },
      { issue: "Cotovelos desalinhados", fix: "Mantenha os cotovelos apontando para baixo e alinhados com os punhos. Evite abrir para os lados.", tag: "alinhamento" },
      { issue: "Balanço do tronco", fix: "Contraia o abdômen antes de iniciar a repetição e mantenha o core firme durante todo o movimento.", tag: "estabilidade" },
    ],
    finalNote: "Repita o exercício com foco em controle da descida e estabilidade do tronco. Se necessário, reduza a carga para manter a técnica.",
  },
};

function getAnalysisForExercise(name: string): AnalysisResult {
  const base = mockAnalysisResults.default;
  return { ...base, exerciseName: name };
}

export default function WorkoutGuide() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("list");
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  // Execution state
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({});
  const [isResting, setIsResting] = useState(false);
  const [restTime, setRestTime] = useState(0);
  const [workoutStartTime, setWorkoutStartTime] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // AI Analysis state
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [showCaptureSheet, setShowCaptureSheet] = useState(false);
  const [showResultSheet, setShowResultSheet] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisToast, setAnalysisToast] = useState(false);
  const [analyzedExercises, setAnalyzedExercises] = useState<Set<string>>(new Set());

  // Warmup state
  const [warmupExercises, setWarmupExercises] = useState<WarmupExercise[]>([]);
  const [warmupIndex, setWarmupIndex] = useState(0);
  const [warmupCompleted, setWarmupCompleted] = useState(false);
  const [warmupTimer, setWarmupTimer] = useState(0);
  const warmupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 4c-3b: real plan (web-authored) with graceful fallback to the mock so the screen never breaks.
  const { data: realPlan } = useQuery({ queryKey: ["workoutPlan"], queryFn: getMyWorkoutPlan });
  const schedule = realPlan && realPlan.length > 0 ? realPlan : workoutSchedule;
  const todayWorkout = schedule.find((w) => w.dayIndex === new Date().getDay());
  const todayId = todayWorkout?.id || schedule[0]?.id;

  useEffect(() => {
    tracker.track('training_plan_viewed');
  }, []);

  // Rest timer
  useEffect(() => {
    if (isResting && restTime > 0) {
      timerRef.current = setInterval(() => {
        setRestTime((t) => {
          if (t <= 1) {
            setIsResting(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isResting, restTime]);

  // Warmup timer
  useEffect(() => {
    if (screen === "warmup" && warmupTimer > 0) {
      warmupTimerRef.current = setInterval(() => {
        setWarmupTimer((t) => {
          if (t <= 1) {
            if (warmupTimerRef.current) clearInterval(warmupTimerRef.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (warmupTimerRef.current) clearInterval(warmupTimerRef.current);
    };
  }, [screen, warmupTimer]);

  const currentExercise = selectedWorkout?.exercises[exerciseIndex];
  const nextExercise = selectedWorkout?.exercises[exerciseIndex + 1];
  const totalSetsInWorkout = selectedWorkout?.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) || 0;
  const completedSetsCount = Object.values(completedSets).reduce((sum, arr) => sum + arr.filter(Boolean).length, 0);
  const progressPercent = totalSetsInWorkout > 0 ? (completedSetsCount / totalSetsInWorkout) * 100 : 0;

  const currentWarmup = warmupExercises[warmupIndex];
  const nextWarmup = warmupExercises[warmupIndex + 1];
  const warmupProgressPercent = warmupExercises.length > 0 ? ((warmupIndex) / warmupExercises.length) * 100 : 0;

  const openDetail = (workout: Workout) => {
    setSelectedWorkout(workout);
    setWarmupCompleted(false);
    setScreen("detail");
  };

  const startWarmup = () => {
    if (!selectedWorkout) return;
    const exercises = getWarmupForWorkout(selectedWorkout);
    setWarmupExercises(exercises);
    setWarmupIndex(0);
    setWarmupTimer(exercises[0]?.durationSeconds || 30);
    setScreen("warmup");
  };

  const advanceWarmup = () => {
    if (warmupTimerRef.current) clearInterval(warmupTimerRef.current);
    const nextIdx = warmupIndex + 1;
    if (nextIdx >= warmupExercises.length) {
      setWarmupCompleted(true);
      setScreen("warmup-done");
    } else {
      setWarmupIndex(nextIdx);
      setWarmupTimer(warmupExercises[nextIdx].durationSeconds);
    }
  };

  const startWorkout = () => {
    if (!selectedWorkout) return;
    const initial: Record<string, boolean[]> = {};
    selectedWorkout.exercises.forEach((ex) => {
      initial[ex.id] = ex.sets.map(() => false);
    });
    setCompletedSets(initial);
    setExerciseIndex(0);
    setSetIndex(0);
    setIsResting(false);
    setWorkoutStartTime(Date.now());
    setScreen("execution");
    setAnalysisStatus("idle");
    setAnalysisResult(null);
    setAnalyzedExercises(new Set());
    tracker.track('workout_checked', { workoutId: selectedWorkout.id, action: 'started' });
  };

  const completeSet = useCallback(() => {
    if (!currentExercise) return;
    const exId = currentExercise.id;
    setCompletedSets((prev) => {
      const arr = [...(prev[exId] || [])];
      arr[setIndex] = true;
      return { ...prev, [exId]: arr };
    });

    const isLastSet = setIndex >= currentExercise.sets.length - 1;
    const isLastExercise = exerciseIndex >= (selectedWorkout?.exercises.length || 0) - 1;

    if (isLastSet && isLastExercise) {
      setTimeout(() => {
        setScreen("complete");
        tracker.track('workout_checked', { workoutId: selectedWorkout?.id, action: 'completed' });
      }, 500);
    } else if (isLastSet) {
      setRestTime(currentExercise.restSeconds);
      setIsResting(true);
    } else {
      setRestTime(currentExercise.restSeconds);
      setIsResting(true);
    }
  }, [currentExercise, setIndex, exerciseIndex, selectedWorkout]);

  const advanceAfterRest = () => {
    if (!currentExercise || !selectedWorkout) return;
    setIsResting(false);
    setRestTime(0);
    if (timerRef.current) clearInterval(timerRef.current);

    const isLastSet = setIndex >= currentExercise.sets.length - 1;
    if (isLastSet) {
      setExerciseIndex((i) => i + 1);
      setSetIndex(0);
    } else {
      setSetIndex((i) => i + 1);
    }
  };

  const finishAndReturn = () => {
    setScreen("list");
    setSelectedWorkout(null);
    setCompletedSets({});
    setExerciseIndex(0);
    setSetIndex(0);
  };

  // ── AI Analysis handlers ──
  const startCapture = (mode: "record" | "upload") => {
    setShowCaptureSheet(false);
    setAnalysisStatus("uploading");

    // Simulate upload → analyzing → ready
    setTimeout(() => {
      setAnalysisStatus("analyzing");
    }, 1500);

    setTimeout(() => {
      if (currentExercise) {
        const result = getAnalysisForExercise(currentExercise.name);
        setAnalysisResult(result);
        setAnalyzedExercises((prev) => new Set(prev).add(currentExercise.id));
        setAnalysisStatus("ready");
        setAnalysisToast(true);
        // Auto-hide toast after 6s
        setTimeout(() => setAnalysisToast(false), 6000);
      }
    }, 5000);
  };

  const elapsedMinutes = workoutStartTime > 0 ? Math.round((Date.now() - workoutStartTime) / 60000) : 0;

  const hasAnalysis = currentExercise ? analyzedExercises.has(currentExercise.id) : false;

  // ── LIST SCREEN ──
  if (screen === "list") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-[430px] mx-auto px-5 pt-14">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
              <ArrowLeft size={20} className="text-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Meu Treino</h1>
              <p className="text-xs text-muted-foreground">Ficha definida pelo seu profissional</p>
            </div>
          </div>

          {todayId && (
            <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-primary" />
                <span className="text-xs font-semibold text-primary">Treino do dia</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Continue sua evolução. Seu treino de hoje está liberado abaixo.</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {schedule.map((w) => {
              const isToday = w.id === todayId;
              return (
                <motion.button
                  key={w.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => isToday ? openDetail(w) : undefined}
                  className={`w-full text-left rounded-2xl p-4 flex items-center justify-between transition-all ${
                    isToday
                      ? "bg-card border border-primary/30 shadow-lg shadow-primary/5"
                      : "bg-card/50 opacity-50"
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-base font-bold text-foreground">
                      Treino {w.letter} — {w.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {w.exercises.length} exercícios • {w.estimatedMinutes} Min • {w.estimatedCalories} kcal
                    </p>
                    {!isToday && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Programado para {w.dayOfWeek}</p>
                    )}
                  </div>
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold text-white ${getDayColor(w.dayOfWeek)}`}>
                    {w.dayOfWeek}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── DETAIL SCREEN ──
  if (screen === "detail" && selectedWorkout) {
    const warmupList = getWarmupForWorkout(selectedWorkout);
    const totalWarmupTime = warmupList.reduce((s, w) => s + w.durationSeconds, 0);

    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-[430px] mx-auto px-5 pt-14">
          <button onClick={() => setScreen("list")} className="flex items-center gap-1 text-primary text-sm font-medium mb-4">
            <ArrowLeft size={16} /> Voltar
          </button>

          <h1 className="text-2xl font-display font-bold text-foreground mb-1">
            Treino {selectedWorkout.letter} — {selectedWorkout.name}
          </h1>

          <div className="flex items-center gap-5 mt-3 mb-5">
            <div className="flex items-center gap-1.5">
              <Clock size={16} className="text-primary" />
              <span className="text-sm text-muted-foreground">{selectedWorkout.estimatedMinutes} Min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame size={16} className="text-primary" />
              <span className="text-sm text-muted-foreground">{selectedWorkout.estimatedCalories} kcal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Dumbbell size={16} className="text-primary" />
              <span className="text-sm text-muted-foreground">{selectedWorkout.exercises.reduce((s, e) => s + e.sets.reduce((a, set) => a + set.weight, 0), 0)} kg</span>
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1.5 mb-6">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold ${
              warmupCompleted ? "bg-emerald-500/15 text-emerald-400" : "bg-primary/15 text-primary"
            }`}>
              <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[8px]">1</span>
              Preparação
            </div>
            <ChevronRight size={12} className="text-muted-foreground/40" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
              <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[8px]">2</span>
              Treino
            </div>
            <ChevronRight size={12} className="text-muted-foreground/40" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
              <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[8px]">3</span>
              Conclusão
            </div>
          </div>

          {/* Warmup block */}
          <div className={`rounded-2xl p-5 mb-5 border ${
            warmupCompleted
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-primary/5 border-primary/20"
          }`}>
            {/* Recommendation badge */}
            {!warmupCompleted && (
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">Recomendado</span>
              </div>
            )}

            <div className="flex items-center gap-2.5 mb-1.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${warmupCompleted ? "bg-emerald-500/15" : "bg-primary/15"}`}>
                <StretchHorizontal size={16} className={warmupCompleted ? "text-emerald-400" : "text-primary"} />
              </div>
              <div>
                <span className={`text-sm font-bold ${warmupCompleted ? "text-emerald-400" : "text-foreground"}`}>
                  {warmupCompleted ? "Preparação concluída ✓" : "Preparação corporal"}
                </span>
                {!warmupCompleted && (
                  <p className="text-[10px] text-primary font-medium">Foco em {getWarmupFocusLabel(selectedWorkout)}</p>
                )}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
              {warmupCompleted
                ? "Seu corpo está preparado. Siga para o treino principal com confiança."
                : "Comece pelos exercícios de membros superiores, com foco na técnica e na amplitude do movimento."}
            </p>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <Dumbbell size={12} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{warmupList.length} exercícios</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">~{Math.ceil(totalWarmupTime / 60)} min</span>
              </div>
            </div>

            {!warmupCompleted && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={startWarmup}
                className="w-full h-12 rounded-xl gradient-orange text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-orange"
              >
                <Play size={16} fill="currentColor" /> Começar preparação
              </motion.button>
            )}
          </div>

          {/* Main workout CTA */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={startWorkout}
            className={`w-full h-14 rounded-2xl font-bold text-base mb-6 flex items-center justify-center gap-2 ${
              warmupCompleted
                ? "gradient-orange text-primary-foreground shadow-orange"
                : "bg-card border border-border text-muted-foreground"
            }`}
          >
            <Play size={20} fill="currentColor" /> {warmupCompleted ? "Iniciar treino principal" : "Pular para o treino"}
          </motion.button>

          <div className="border-t border-border pt-5">
            <h2 className="text-lg font-bold text-foreground mb-4">Exercícios</h2>
            <div className="flex flex-col gap-3">
              {selectedWorkout.exercises.map((ex) => (
                <div key={ex.id} className="bg-card rounded-xl p-3 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-white overflow-hidden flex-shrink-0">
                    <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ex.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ex.sets.length} séries • {ex.sets[0]?.reps} reps
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── WARMUP SCREEN ──
  if (screen === "warmup" && currentWarmup) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="max-w-[430px] w-full mx-auto px-5 pt-12 pb-2">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => { setScreen("detail"); if (warmupTimerRef.current) clearInterval(warmupTimerRef.current); }} className="w-9 h-9 rounded-full bg-card flex items-center justify-center">
              <X size={18} className="text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">Preparação</span>
              {selectedWorkout && (
                <span className="text-[10px] text-muted-foreground">{getWarmupFocusLabel(selectedWorkout)}</span>
              )}
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-card overflow-hidden mb-4">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${warmupProgressPercent}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] text-muted-foreground">
              {warmupIndex + 1} de {warmupExercises.length} · Treino de membros superiores
            </p>
            <p className="text-[10px] text-primary font-semibold">
              Exercícios
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-[430px] w-full mx-auto px-5 overflow-y-auto pb-4">
          {/* GIF */}
          <div className="w-full aspect-square max-h-[260px] rounded-2xl bg-muted overflow-hidden mb-5">
            <img
              src={currentWarmup.gifUrl}
              alt={currentWarmup.name}
              className="w-full h-full object-contain"
              onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
            />
          </div>

          <h2 className="text-lg font-bold text-foreground mb-1">{currentWarmup.name}</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{currentWarmup.focusArea}</span>
          </div>

          <div className="bg-card rounded-xl p-4 mb-4 border border-border/50">
            <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-1.5">Como fazer</p>
            <p className="text-sm text-foreground leading-relaxed">{currentWarmup.instruction}</p>
          </div>

          <div className="flex items-center gap-4 mb-4">
            {currentWarmup.reps && (
              <div className="bg-card rounded-xl px-4 py-3 text-center">
                <p className="text-lg font-bold text-foreground">{currentWarmup.reps}</p>
                <p className="text-[10px] text-muted-foreground">repetições</p>
              </div>
            )}
            <div className="bg-card rounded-xl px-4 py-3 text-center flex-1">
              <p className="text-lg font-bold text-foreground tabular-nums">
                {String(Math.floor(warmupTimer / 60)).padStart(2, "0")}:{String(warmupTimer % 60).padStart(2, "0")}
              </p>
              <p className="text-[10px] text-muted-foreground">duração</p>
            </div>
          </div>

          {/* Next warmup preview */}
          {nextWarmup && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground font-medium mb-2">Próximo</p>
              <div className="bg-card rounded-xl p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  <img
                    src={nextWarmup.gifUrl}
                    alt={nextWarmup.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{nextWarmup.name}</p>
                  <p className="text-xs text-muted-foreground">{nextWarmup.focusArea}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="max-w-[430px] w-full mx-auto px-5 pb-6">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={advanceWarmup}
            className="w-full h-14 rounded-2xl gradient-orange text-primary-foreground font-bold text-base shadow-orange flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} /> {warmupIndex >= warmupExercises.length - 1 ? "Concluir treino" : "Próximo"}
          </motion.button>
        </div>
      </div>
    );
  }

  // ── WARMUP DONE SCREEN ──
  if (screen === "warmup-done" && selectedWorkout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="max-w-[430px] w-full mx-auto px-6 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", damping: 12 }}
            className="w-20 h-20 rounded-full bg-emerald-500/15 mx-auto flex items-center justify-center mb-6"
          >
            <CheckCircle2 size={36} className="text-emerald-400" />
          </motion.div>

          <h1 className="text-xl font-display font-bold text-foreground mb-2">Preparação concluída!</h1>
          <p className="text-sm text-muted-foreground mb-3">
            Membros superiores concluídos. Você está pronto para o treino principal.
          </p>

          {/* Summary stats */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="text-center">
              <p className="text-lg font-display font-bold text-primary">{warmupExercises.length}</p>
              <p className="text-[10px] text-muted-foreground">exercícios</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-lg font-display font-bold text-primary">~{Math.ceil(warmupExercises.reduce((s, w) => s + w.durationSeconds, 0) / 60)}</p>
              <p className="text-[10px] text-muted-foreground">minutos</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-lg font-display font-bold text-emerald-400">✓</p>
              <p className="text-[10px] text-muted-foreground">{getWarmupFocusLabel(selectedWorkout)}</p>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground mb-6 px-4 leading-relaxed">
            Boa! A preparação melhora a qualidade da execução e reduz o risco de lesões.
          </p>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setWarmupCompleted(true);
              setScreen("detail");
            }}
            className="w-full h-14 rounded-2xl gradient-orange text-primary-foreground font-bold text-base shadow-orange flex items-center justify-center gap-2"
          >
            <Play size={20} fill="currentColor" /> Seguir para o treino principal
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── EXECUTION SCREEN ──
  if (screen === "execution" && selectedWorkout && currentExercise) {
    const exSets = completedSets[currentExercise.id] || [];
    const currentSetData = currentExercise.sets[setIndex];

    return (
      <div className="min-h-screen bg-background flex flex-col relative">
        {/* Header */}
        <div className="max-w-[430px] w-full mx-auto px-5 pt-12 pb-2">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => { setScreen("detail"); setIsResting(false); if (timerRef.current) clearInterval(timerRef.current); }} className="w-9 h-9 rounded-full bg-card flex items-center justify-center">
              <X size={18} className="text-foreground" />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-primary font-medium">Estatísticas</span>
              <span className="text-xs text-muted-foreground">Lista de exercícios</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-card overflow-hidden mb-4">
            <motion.div
              className="h-full gradient-orange rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <div className="flex-1 max-w-[430px] w-full mx-auto px-5 overflow-y-auto pb-4">
          {/* Exercise info */}
          <div className="flex items-start gap-3 mb-5">
            <div className="w-20 h-20 rounded-xl bg-white overflow-hidden flex-shrink-0">
              <img src={currentExercise.gifUrl} alt={currentExercise.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">{currentExercise.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{currentExercise.muscleGroups.join(", ")}</p>
              {/* Analysis badge */}
              {hasAnalysis && (
                <button
                  onClick={() => setShowResultSheet(true)}
                  className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/25"
                >
                  <Sparkles size={10} className="text-primary" />
                  <span className="text-[10px] font-medium text-primary">Análise disponível</span>
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          {currentExercise.notes && (
            <div className="flex gap-2 mb-5">
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-card text-xs text-muted-foreground">
                <StickyNote size={12} /> {currentExercise.notes}
              </span>
            </div>
          )}

          {/* Uploading / Analyzing inline status */}
          <AnimatePresence>
            {(analysisStatus === "uploading" || analysisStatus === "analyzing") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  >
                    <Sparkles size={16} className="text-primary" />
                  </motion.div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-primary">
                      {analysisStatus === "uploading" ? "Enviando sua execução…" : "Analisando seu movimento…"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Continue o treino normalmente</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sets */}
          <div className="flex flex-col gap-2 mb-5">
            {currentExercise.sets.map((s, i) => {
              const done = exSets[i];
              const isCurrent = i === setIndex && !isResting;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex flex-col items-center w-8">
                    {done ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                        <CheckCircle2 size={16} className="text-white" />
                      </div>
                    ) : (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCurrent ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                      }`}>
                        {i + 1}
                      </div>
                    )}
                    {i < currentExercise.sets.length - 1 && (
                      <div className={`w-0.5 h-4 ${done ? "bg-emerald-500/40" : "bg-card"}`} />
                    )}
                  </div>

                  <div className={`flex-1 flex items-center justify-between rounded-xl px-4 py-3 transition-all ${
                    isCurrent
                      ? "bg-card border-2 border-primary"
                      : done
                        ? "bg-card/40 border border-emerald-500/20"
                        : "bg-card border border-transparent"
                  }`}>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <span className="text-lg font-bold text-foreground">{s.reps}</span>
                        <span className="text-xs text-muted-foreground ml-1">reps</span>
                      </div>
                      <span className="text-muted-foreground/30">·</span>
                      <div className="text-center">
                        <span className="text-lg font-bold text-foreground">{s.weight}</span>
                        <span className="text-xs text-muted-foreground ml-1">kg</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Next exercise preview */}
          {nextExercise && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground font-medium mb-2">Próximo exercício</p>
              <div className="bg-card rounded-xl p-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-white overflow-hidden flex-shrink-0">
                  <img src={nextExercise.gifUrl} alt={nextExercise.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{nextExercise.name}</p>
                  <p className="text-xs text-muted-foreground">{nextExercise.sets.length} séries • {nextExercise.sets[0]?.reps} reps</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FAB: Analyze execution ── */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setShowCaptureSheet(true);
          }}
          className="fixed bottom-[140px] right-5 z-40 w-12 h-12 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center"
          style={{ maxWidth: 430 }}
        >
          <Video size={20} className="text-primary-foreground" />
        </motion.button>

        {/* ── Analysis Toast ── */}
        <AnimatePresence>
          {analysisToast && (
            <motion.button
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              onClick={() => { setAnalysisToast(false); setShowResultSheet(true); }}
              className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-primary/30 shadow-2xl"
            >
              <Sparkles size={14} className="text-primary" />
              <span className="text-xs font-semibold text-foreground">Sua análise está pronta</span>
              <ChevronDown size={12} className="text-muted-foreground" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Capture Sheet ── */}
        <AnimatePresence>
          {showCaptureSheet && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCaptureSheet(false)}
                className="fixed inset-0 z-50 bg-black/60"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl px-6 pt-5 pb-8 max-w-[430px] mx-auto"
              >
                <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto mb-5" />
                <div className="flex items-center gap-3 mb-1">
                  <Sparkles size={18} className="text-primary" />
                  <h3 className="text-base font-bold text-foreground">Analisar execução</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-6">
                  Grave ou envie um vídeo da sua execução. A IA vai avaliar seu movimento e sugerir melhorias.
                </p>

                <div className="flex flex-col gap-3">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => startCapture("record")}
                    className="w-full h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center gap-3"
                  >
                    <Camera size={20} className="text-primary" />
                    <span className="text-sm font-semibold text-primary">Gravar agora</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => startCapture("upload")}
                    className="w-full h-14 rounded-2xl bg-card border border-border flex items-center justify-center gap-3"
                  >
                    <Upload size={20} className="text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Enviar da galeria</span>
                  </motion.button>
                </div>

                <button
                  onClick={() => setShowCaptureSheet(false)}
                  className="w-full mt-4 text-center text-xs text-muted-foreground py-2"
                >
                  Cancelar
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Result Sheet ── */}
        <AnimatePresence>
          {showResultSheet && analysisResult && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowResultSheet(false)}
                className="fixed inset-0 z-50 bg-black/60"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-w-[430px] mx-auto max-h-[85vh] overflow-y-auto"
              >
                <div className="sticky top-0 bg-card px-6 pt-5 pb-3 z-10">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto mb-4" />
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Análise da execução</h3>
                      <p className="text-xs text-muted-foreground">{analysisResult.exerciseName}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                      analysisResult.status === "boa execução"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : analysisResult.status === "atenção"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-red-500/15 text-red-400"
                    }`}>
                      {analysisResult.status}
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-8">
                  {/* Score block */}
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/8 to-transparent border border-primary/10 mb-5 mt-2">
                    <div className="relative w-14 h-14 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15" fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="3"
                          strokeDasharray={`${analysisResult.overallScore * 0.94} 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-foreground">
                        {analysisResult.overallScore}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground mb-0.5">Precisão da execução</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{analysisResult.summary}</p>
                    </div>
                  </div>

                  {/* Positives */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <p className="text-xs font-bold text-emerald-400">Pontos positivos</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {analysisResult.positives.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-500/5">
                          <span className="text-emerald-400 text-[10px] mt-0.5 shrink-0">✓</span>
                          <span className="text-xs text-foreground">{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Improvements */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <AlertCircle size={14} className="text-amber-400" />
                      <p className="text-xs font-bold text-amber-400">Pontos a melhorar</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {analysisResult.improvements.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/5">
                          <span className="text-amber-400 text-[10px] mt-0.5 shrink-0">!</span>
                          <span className="text-xs text-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* How to correct — main new block */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Zap size={14} className="text-primary" />
                      <p className="text-xs font-bold text-primary">Como corrigir</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {analysisResult.corrections.map((c, i) => (
                        <div key={i} className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">{c.tag}</span>
                            <span className="text-[11px] font-semibold text-foreground">{c.issue}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{c.fix}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Final recommendation */}
                  <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-card to-secondary border border-border">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-foreground mb-1">Recomendação prática</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{analysisResult.finalNote}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2.5">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setShowResultSheet(false);
                        setShowCaptureSheet(true);
                      }}
                      className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <Video size={16} />
                      Gravar nova tentativa
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowResultSheet(false)}
                      className="w-full h-12 rounded-2xl bg-muted text-foreground font-semibold text-sm"
                    >
                      Continuar treino
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Bottom action / Rest overlay */}
        <AnimatePresence>
          {isResting ? (
            <motion.div
              key="rest"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="max-w-[430px] w-full mx-auto px-5 pb-6"
            >
              <div className="bg-card rounded-2xl p-5 shadow-2xl border border-border">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <button
                    onClick={() => setRestTime((t) => Math.max(0, t + 15))}
                    className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
                  >
                    <Timer size={16} className="text-muted-foreground" />
                  </button>
                  <div className="text-center">
                    <p className="text-4xl font-display font-bold text-foreground tabular-nums">
                      {String(Math.floor(restTime / 60)).padStart(2, "0")}:{String(restTime % 60).padStart(2, "0")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {restTime > 10 ? "Descanse!" : "Prepare-se!"}
                    </p>
                  </div>
                  <button
                    onClick={() => { setIsResting(false); setRestTime(0); if (timerRef.current) clearInterval(timerRef.current); }}
                    className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
                  >
                    <span className="text-lg text-muted-foreground">⏸</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => { setScreen("detail"); setIsResting(false); if (timerRef.current) clearInterval(timerRef.current); }}
                    className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <ArrowLeft size={18} className="text-muted-foreground" />
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={advanceAfterRest}
                    className="flex-1 h-12 rounded-xl gradient-orange text-primary-foreground font-bold text-sm"
                  >
                    Próximo
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="action"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="max-w-[430px] w-full mx-auto px-5 pb-6"
            >
              <div className="bg-card rounded-2xl p-4 shadow-2xl border border-border">
                <div className="text-center mb-3">
                  <p className="text-base font-bold text-foreground">Vamos lá!</p>
                  <p className="text-xs text-muted-foreground">
                    Série {setIndex + 1} de {currentExercise.sets.length} • {currentSetData?.reps} reps • {currentSetData?.weight}kg
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => { setScreen("detail"); setIsResting(false); if (timerRef.current) clearInterval(timerRef.current); }}
                    className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <ArrowLeft size={18} className="text-muted-foreground" />
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={completeSet}
                    className="flex-1 h-12 rounded-xl gradient-orange text-primary-foreground font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} /> Concluir série
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── COMPLETE SCREEN ──
  if (screen === "complete" && selectedWorkout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="max-w-[430px] w-full mx-auto px-5 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", damping: 12 }}
            className="w-24 h-24 rounded-full gradient-orange mx-auto flex items-center justify-center mb-6 shadow-orange"
          >
            <Trophy size={40} className="text-primary-foreground" />
          </motion.div>

          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Treino Concluído!</h1>
          <p className="text-sm text-muted-foreground mb-8">Mais um passo na sua jornada de evolução</p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-card rounded-xl p-4">
              <Dumbbell size={20} className="text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{selectedWorkout.exercises.length}</p>
              <p className="text-[10px] text-muted-foreground">Exercícios</p>
            </div>
            <div className="bg-card rounded-xl p-4">
              <Clock size={20} className="text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{elapsedMinutes || selectedWorkout.estimatedMinutes}</p>
              <p className="text-[10px] text-muted-foreground">Minutos</p>
            </div>
            <div className="bg-card rounded-xl p-4">
              <Flame size={20} className="text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{selectedWorkout.estimatedCalories}</p>
              <p className="text-[10px] text-muted-foreground">kcal</p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={finishAndReturn}
            className="w-full h-14 rounded-2xl gradient-orange text-primary-foreground font-bold text-base shadow-orange"
          >
            Continuar evolução
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return null;
}
