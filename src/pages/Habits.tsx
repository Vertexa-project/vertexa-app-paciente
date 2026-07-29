import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Droplets, Moon, Footprints, Smile, Plus, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { habitTracking } from "@/data/mockData";
import { tracker } from "@/lib/eventTracker";
import { logHydration, getHydrationTodayLiters } from "@/lib/api";
import { WATER_GOAL_LITERS, WATER_INCREMENT_LITERS } from "@/lib/hydrationMath";
import BottomNav from "@/components/BottomNav";
import ComingSoonLock, { STEPS_LOCK_REASON } from "@/components/ComingSoonLock";

export default function Habits() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mood, setMood] = useState(habitTracking.mood);
  const [saved, setSaved] = useState<string | null>(null);

  const showSaved = useCallback((label: string) => {
    setSaved(label);
    setTimeout(() => setSaved(null), 1500);
  }, []);

  // "Água de hoje" = soma dos eventos hydration_logged do dia (payload.liters) — fonte: banco.
  const hydrationToday = useQuery({ queryKey: ["hydrationToday"], queryFn: getHydrationTodayLiters });
  const water = hydrationToday.data ?? 0;
  const goalReached = water >= WATER_GOAL_LITERS;

  const addWater = useMutation({
    mutationFn: () => logHydration({ liters: WATER_INCREMENT_LITERS }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["hydrationToday"] });
      const prev = qc.getQueryData<number>(["hydrationToday"]) ?? 0;
      qc.setQueryData(["hydrationToday"], Math.round((prev + WATER_INCREMENT_LITERS) * 100) / 100);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(["hydrationToday"], ctx.prev);
      showSaved("Falha ao registrar água");
    },
    onSuccess: () => showSaved("Água registrada!"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["hydrationToday"] });
    },
  });

  const logMood = (m: string) => {
    setMood(m as typeof mood);
    // mood_logged é hábito: o eventSync recomputa o VRI; a Home relê o snapshot ao montar.
    tracker.track("mood_logged", { mood: m });
    showSaved("Humor registrado!");
  };

  const moods = [
    { key: "otimo", label: "Ótimo", emoji: "😄" },
    { key: "bem", label: "Bem", emoji: "🙂" },
    { key: "neutro", label: "Neutro", emoji: "😐" },
    { key: "mal", label: "Mal", emoji: "😔" },
  ];

  const waterPct = Math.min((water / WATER_GOAL_LITERS) * 100, 100);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Hábitos do dia</h1>
        </div>

        {/* Water */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 shadow-card mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Droplets size={20} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Hidratação</h3>
            </div>
            <span className="text-xs text-muted-foreground">{water.toFixed(2)}L / {WATER_GOAL_LITERS}L</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
            <motion.div className={`h-full rounded-full ${goalReached ? "bg-success" : "gradient-orange"}`} animate={{ width: `${waterPct}%` }} />
          </div>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <span className="text-3xl font-display font-bold text-foreground">{water.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground ml-1">L hoje</span>
            </div>
            <button onClick={() => addWater.mutate()} disabled={addWater.isPending}
              className="h-12 px-5 rounded-full gradient-orange flex items-center gap-2 shadow-orange active:scale-95 transition-transform disabled:opacity-60">
              <Plus size={20} className="text-primary-foreground" />
              <span className="text-sm font-semibold text-primary-foreground">+{WATER_INCREMENT_LITERS}L</span>
            </button>
          </div>
          {goalReached && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs text-success font-medium mt-3">
              ✓ Meta de hidratação atingida!
            </motion.p>
          )}
        </motion.div>

        {/* Sleep */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-5 shadow-card mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Moon size={20} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Sono</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl font-display font-bold text-foreground">{habitTracking.sleep.hours}</span>
              <span className="text-sm text-muted-foreground ml-1">horas</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Qualidade: <span className="text-success font-medium">{habitTracking.sleep.quality}</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{habitTracking.sleep.bedtime} → {habitTracking.sleep.wakeup}</p>
            </div>
          </div>
        </motion.div>

        {/* Steps — BLOQUEADO (WP-APP-1).
            O card abaixo mostrava `habitTracking.steps` (6.420 / 8.000), que é MOCK fixo em
            src/data/mockData.ts: não vem de aparelho, de relógio nem de tabela — nunca muda.
            Trocado pelo cadeado. O código do card ativo está preservado logo abaixo, comentado,
            para voltar inteiro quando existir a integração; ele só precisa trocar
            `habitTracking.steps` pela fonte real. NÃO apagar. */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-4">
          <ComingSoonLock title="Passos" reason={STEPS_LOCK_REASON} icon={Footprints} />
        </motion.div>

        {/* DESATIVADO ATRÁS DO CADEADO — não apagar (ver comentário acima):
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-5 shadow-card mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Footprints size={20} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Passos</h3>
            </div>
            <span className="text-xs text-muted-foreground">{habitTracking.steps.current.toLocaleString()} / {habitTracking.steps.target.toLocaleString()}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full rounded-full gradient-orange" initial={{ width: 0 }}
              animate={{ width: `${(habitTracking.steps.current / habitTracking.steps.target) * 100}%` }} transition={{ duration: 0.8 }} />
          </div>
        </motion.div>
        */}

        {/* Mood */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl p-5 shadow-card mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Smile size={20} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Como você está?</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {moods.map((m) => (
              <button key={m.key} onClick={() => logMood(m.key)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${
                  mood === m.key ? "gradient-orange shadow-orange" : "bg-muted"
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className={`text-[10px] font-medium ${mood === m.key ? "text-primary-foreground" : "text-muted-foreground"}`}>{m.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Save feedback */}
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-success text-success-foreground px-5 py-3 rounded-full flex items-center gap-2 shadow-lg z-50"
            >
              {saved.startsWith("Falha") ? <X size={16} /> : <Check size={16} />}
              <span className="text-sm font-medium">{saved}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick-add water FAB (flutuante), empilhado acima do botão de chat (bottom-[88px]) */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onClick={() => addWater.mutate()}
        disabled={addWater.isPending}
        aria-label={`Registrar +${WATER_INCREMENT_LITERS}L de água`}
        className="fixed z-40 right-5 bottom-[148px] w-14 h-14 rounded-full bg-card border border-primary/30 shadow-lg flex flex-col items-center justify-center active:scale-95 transition-transform disabled:opacity-60"
      >
        <Droplets size={18} className="text-primary" />
        <span className="text-[9px] font-bold text-primary leading-none mt-0.5">+{WATER_INCREMENT_LITERS}L</span>
      </motion.button>

      <BottomNav />
    </div>
  );
}
