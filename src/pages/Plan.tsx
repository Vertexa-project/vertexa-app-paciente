import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Clock, Pill, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mealPlan } from "@/data/mockData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyNutritionPlan,
  getMealsDoneToday,
  toggleMealDone,
  getMySupplements,
  getSupplementsTakenToday,
  toggleSupplementTaken,
} from "@/lib/api";
import { tracker } from "@/lib/eventTracker";
import { localDateKey } from "@/lib/pendingLogic";
import BottomNav from "@/components/BottomNav";

type Tab = "alimentar" | "treino" | "suplementos" | "orientacoes";

// Refeição normalizada para a UI: plano real traz `id` (meals.id); mock não (id=null -> check off).
interface MealRow {
  id: string | null;
  time: string;
  name: string;
  items: string[];
  calories: number | null;
  done: boolean;
}

// Ícone por nome do suplemento (cosmético; o schema não guarda ícone — autoria web futura pode
// evoluir isso). Fallback 💊 para nomes fora do mapa.
function supplementIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("whey") || n.includes("prote")) return "💪";
  if (n.includes("creatina")) return "⚡";
  if (n.includes("ômega") || n.includes("omega")) return "🐟";
  if (n.includes("vitamina d")) return "☀️";
  if (n.includes("magnésio") || n.includes("magnesio")) return "🌙";
  return "💊";
}

export default function Plan() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("alimentar");
  const [, setExpandedWorkout] = useState<number | null>(null);

  useEffect(() => { tracker.track('plan_viewed'); }, []);

  // 4c-3b: real nutrition plan (web-authored) with graceful fallback to mock so the screen never breaks.
  const { data: nutritionPlan, isError: planError } = useQuery({ queryKey: ["nutritionPlan"], queryFn: getMyNutritionPlan });
  useEffect(() => {
    if (planError && import.meta.env.DEV) {
      console.warn("[VERTEXA Plan] failed to load real nutrition plan; using mock", planError);
    }
  }, [planError]);
  const usingRealMeals = !!(nutritionPlan && nutritionPlan.meals.length > 0);
  const meals: MealRow[] = usingRealMeals
    ? nutritionPlan!.meals.map((m) => ({ id: m.id, time: m.time, name: m.name, items: m.items, calories: m.calories, done: m.done }))
    : mealPlan.map((m) => ({ id: null, time: m.time, name: m.name, items: m.items, calories: m.calories, done: m.done }));
  const planTitle = usingRealMeals ? nutritionPlan!.title : "";

  // "Feita" de hoje vem de meal_logs (só faz sentido com plano real). Optimistic no toggle.
  // Queries "de hoje" são KEYADAS pela data LOCAL (precedente: Progress.tsx) — virou o dia, a key
  // muda e o cache de ontem não vaza como se fosse de hoje (sessão aberta cruzando a meia-noite).
  const qc = useQueryClient();
  const todayKey = localDateKey(new Date());
  const mealsDoneKey = ["mealsDoneToday", todayKey];
  const { data: doneToday } = useQuery({
    queryKey: mealsDoneKey,
    queryFn: getMealsDoneToday,
    enabled: usingRealMeals,
  });

  const toggleMeal = useMutation({
    mutationFn: ({ mealId, on }: { mealId: string; on: boolean }) => toggleMealDone({ mealId, on }),
    onMutate: async ({ mealId, on }) => {
      await qc.cancelQueries({ queryKey: mealsDoneKey });
      const prev = qc.getQueryData<Set<string>>(mealsDoneKey);
      const next = new Set(prev ?? []);
      if (on) next.add(mealId);
      else next.delete(mealId);
      qc.setQueryData(mealsDoneKey, next);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      // prev=undefined = otimista semeado ANTES do 1º fetch resolver; setQueryData(undefined) é no-op
      // no react-query v5 -> remove a query para não deixar um check "fantasma" no cache.
      if (ctx?.prev) qc.setQueryData(mealsDoneKey, ctx.prev);
      else qc.removeQueries({ queryKey: mealsDoneKey });
    },
    onSuccess: (_data, { mealId, on }) => {
      // Marcador de timeline + recálculo do VRI só ao MARCAR (objetivo: "só no marcar, não no desmarcar").
      // A linha já foi gravada em meal_logs -> o recompute do eventSync a enxerga. DESMARCAR de propósito
      // NÃO recomputa o VRI: o fator alimentar é aditivo/não-negativo (nunca rebaixa a Mariana 88/alta) e o
      // snapshot se auto-corrige no próximo evento relevante. O eventSync invalida ['adherence'] após gravar.
      if (on) tracker.track("meal_logged", { meal_id: mealId });
    },
    onSettled: () => {
      // meal_logs já está atualizado (mutationFn aguardada) -> estas leituras refletem o toggle na hora.
      void qc.invalidateQueries({ queryKey: ["mealsDoneToday"] });
      void qc.invalidateQueries({ queryKey: ["mealAdherenceToday"] });
      // NÃO invalidar ['adherence'] aqui: o snapshot do VRI é escrito por cadeia async do eventSync;
      // invalidar agora releria o snapshot ANTIGO. Quem invalida ['adherence'] é o eventSync, pós-insert.
    },
  });

  const handleToggleMeal = (mealId: string | null, currentlyDone: boolean) => {
    if (!mealId) return; // sem plano real não há o que gravar
    toggleMeal.mutate({ mealId, on: !currentlyDone });
  };

  // ── Suplementos (S3): lista REAL (autoria web) + "tomado hoje" persistido (supplement_intakes) ──
  const {
    data: supplementList = [],
    isLoading: supplementsLoading,
    isError: supplementsError,
    refetch: refetchSupplements,
  } = useQuery({ queryKey: ["supplements"], queryFn: getMySupplements });

  // Keyada pela data LOCAL (mesmo racional do mealsDoneKey acima).
  const supplementsTakenKey = ["supplementsTakenToday", todayKey];
  const { data: supplementsTaken } = useQuery({
    queryKey: supplementsTakenKey,
    queryFn: getSupplementsTakenToday,
    enabled: supplementList.length > 0,
  });

  // Mesmo padrão otimista do toggleMeal (S13). Marcador + VRI só ao MARCAR; desmarcar não recomputa
  // (fator aditivo/não-negativo; o snapshot se auto-corrige no próximo evento). ['adherence'] é
  // invalidada pelo eventSync pós-snapshot, nunca aqui.
  const toggleSupplement = useMutation({
    mutationFn: ({ supplementId, on }: { supplementId: string; on: boolean }) =>
      toggleSupplementTaken({ supplementId, on }),
    onMutate: async ({ supplementId, on }) => {
      await qc.cancelQueries({ queryKey: supplementsTakenKey });
      const prev = qc.getQueryData<Set<string>>(supplementsTakenKey);
      const next = new Set(prev ?? []);
      if (on) next.add(supplementId);
      else next.delete(supplementId);
      qc.setQueryData(supplementsTakenKey, next);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      // Mesmo racional do toggleMeal: prev=undefined -> removeQueries (setQueryData(undefined) é no-op).
      if (ctx?.prev) qc.setQueryData(supplementsTakenKey, ctx.prev);
      else qc.removeQueries({ queryKey: supplementsTakenKey });
    },
    onSuccess: (_data, { supplementId, on }) => {
      if (on) tracker.track("supplement_checked", { supplement_id: supplementId });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["supplementsTakenToday"] });
    },
  });

  const handleToggleSupplement = (supplementId: string, currentlyTaken: boolean) => {
    toggleSupplement.mutate({ supplementId, on: !currentlyTaken });
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === 'alimentar') tracker.track('meal_plan_viewed');
    if (t === 'treino') tracker.track('training_plan_viewed');
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "alimentar", label: "Alimentar" },
    { key: "treino", label: "Treino" },
    { key: "suplementos", label: "Suplem." },
    { key: "orientacoes", label: "Dicas" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Meu Plano</h1>
        </div>

        <div className="flex gap-2 mb-5 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                tab === t.key ? "gradient-orange text-primary-foreground shadow-orange" : "bg-card text-muted-foreground"
              }`}>{t.label}</button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "alimentar" && (
            <motion.div key="alimentar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              {planTitle && (
                <div className="flex items-center gap-2 mb-1 px-1">
                  <BookOpen size={16} className="text-primary" />
                  <span className="text-sm font-semibold text-foreground">{planTitle}</span>
                </div>
              )}
              {meals.map((meal, i) => {
                const isDone = usingRealMeals && meal.id ? (doneToday?.has(meal.id) ?? false) : meal.done;
                return (
                <div key={meal.id ?? i} className={`bg-card rounded-xl p-4 ${isDone ? "border border-success/20" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{meal.time}</span>
                      <span className="text-sm font-semibold text-foreground">{meal.name}</span>
                    </div>
                    {usingRealMeals ? (
                      <button
                        onClick={() => handleToggleMeal(meal.id, isDone)}
                        disabled={toggleMeal.isPending}
                        aria-pressed={isDone}
                        aria-label={isDone ? `Desmarcar ${meal.name}` : `Marcar ${meal.name} como feita`}
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all disabled:opacity-60 ${
                          isDone ? "bg-success border-success" : "border-muted-foreground/40 hover:border-success/60"
                        }`}
                      >
                        {isDone && <Check size={12} className="text-success-foreground" />}
                      </button>
                    ) : (
                      <div
                        aria-disabled
                        title="Disponível quando seu nutricionista publicar o plano"
                        className="w-6 h-6 rounded-full flex items-center justify-center border border-muted-foreground/20 opacity-40"
                      >
                        {meal.done && <Check size={12} className="text-muted-foreground" />}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 ml-6">
                    {meal.items.map((item, j) => (<span key={j} className="text-xs text-muted-foreground">• {item}</span>))}
                  </div>
                  <div className="mt-2 ml-6 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{meal.calories} kcal</span>
                    <button className="text-[10px] text-primary font-medium">Ver opções</button>
                  </div>
                </div>
                );
              })}
            </motion.div>
          )}

          {tab === "treino" && (
            <motion.div key="treino" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
              <div className="bg-card rounded-xl p-4 border border-primary/20">
                <p className="text-sm font-semibold text-foreground mb-1">Guia de Treino Interativo</p>
                <p className="text-xs text-muted-foreground mb-3">Veja sua ficha completa, inicie o treino do dia e acompanhe seu progresso exercício por exercício.</p>
                <button onClick={() => navigate('/workout-guide')} className="w-full h-11 rounded-xl gradient-orange text-primary-foreground text-sm font-bold flex items-center justify-center gap-2">
                  Abrir meu treino
                </button>
              </div>
            </motion.div>
          )}

          {tab === "suplementos" && (
            <motion.div key="suplementos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              {supplementsLoading ? (
                [0, 1, 2].map((i) => (
                  <div key={i} className="h-[72px] bg-card rounded-xl animate-pulse" />
                ))
              ) : supplementsError && supplementList.length === 0 ? (
                // Card de erro SÓ quando não há cache válido: refetch de fundo falho (isError=true com
                // data preservado no v5) não pode esconder a lista/checks já carregados.
                <div className="bg-card rounded-xl p-5 flex flex-col items-center gap-2 text-center border border-dashed border-red-500/30">
                  <p className="text-xs text-red-400">Não foi possível carregar seus suplementos.</p>
                  <button onClick={() => refetchSupplements()} className="text-[11px] font-semibold text-primary">
                    Tentar novamente
                  </button>
                </div>
              ) : supplementList.length === 0 ? (
                <div className="bg-card rounded-xl p-5 flex flex-col items-center gap-2 text-center border border-dashed border-border">
                  <Pill size={18} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Nenhum suplemento cadastrado ainda.</p>
                  <p className="text-[10px] text-muted-foreground">Seu profissional publica a lista aqui.</p>
                </div>
              ) : (
                supplementList.map((s) => {
                  const isTaken = supplementsTaken?.has(s.id) ?? false;
                  return (
                    <div key={s.id} className={`bg-card rounded-xl p-4 flex items-center gap-3 ${isTaken ? "border border-success/20" : ""}`}>
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">{supplementIcon(s.name)}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[s.dose, s.time_label].filter(Boolean).join(" • ")}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleSupplement(s.id, isTaken)}
                        disabled={toggleSupplement.isPending}
                        aria-pressed={isTaken}
                        aria-label={isTaken ? `Desmarcar ${s.name}` : `Marcar ${s.name} como tomado`}
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all disabled:opacity-60 ${
                          isTaken ? "bg-success border-success" : "border-muted-foreground/40 hover:border-success/60"
                        }`}
                      >
                        {isTaken && <Check size={12} className="text-success-foreground" />}
                      </button>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {tab === "orientacoes" && (
            <motion.div key="orientacoes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              {[
                { title: "Hidratação adequada", desc: "Beba pelo menos 2.5L de água por dia, distribuídos ao longo do dia." },
                { title: "Sono reparador", desc: "Durma entre 7-8 horas. Evite telas 1h antes de dormir." },
                { title: "Alimentação consciente", desc: "Coma devagar, mastigue bem e evite distrações durante as refeições." },
                { title: "Gerenciamento de estresse", desc: "Pratique 10 minutos de respiração ou meditação diariamente." },
              ].map((o, i) => (
                <div key={i} className="bg-card rounded-xl p-4 flex items-start gap-3">
                  <BookOpen size={18} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{o.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{o.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
