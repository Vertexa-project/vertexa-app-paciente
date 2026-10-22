import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WeekWorkouts from "@/components/WeekWorkouts";
import { WeekAdherenceCard, WeekStrip } from "@/components/SupplementWeekStrip";
import { supplementWeek } from "@/lib/supplementWeek";
import { weekStart } from "@/lib/weeklySummary";
import { ArrowLeft, Check, Clock, Pill, BookOpen, UtensilsCrossed, Dumbbell, Droplet, Moon, Utensils, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyNutritionPlan,
  getMealsDoneToday,
  toggleMealDone,
  registerMealOption,
  getMealOptionsToday,
  getMySupplements,
  getSupplementsTakenToday,
  getWorkoutCompletionsSince,
  getSupplementIntakesWeek,
  toggleSupplementTaken,
  getMyWorkoutPlan,
} from "@/lib/api";
import { tracker } from "@/lib/eventTracker";
import { reminderLabel } from "@/lib/supplementReminders";
import { localDateKey } from "@/lib/pendingLogic";
import BottomNav from "@/components/BottomNav";
import MealOptionsSheet from "@/components/MealOptionsSheet";
import { allOptions, type MealOption } from "@/lib/mealOptions";
import NoPrescriptionYet, {
  NO_MEAL_PLAN_TITLE,
  NO_MEAL_PLAN_MESSAGE,
  NO_WORKOUT_PLAN_TITLE,
  NO_WORKOUT_PLAN_MESSAGE,
} from "@/components/NoPrescriptionYet";

type Tab = "alimentar" | "treino" | "suplementos" | "orientacoes";

// Refeição normalizada para a UI. `id` é sempre string (meals.id): desde o WP-APP-2 só entram
// aqui refeições de plano REAL — não existe mais linha sem id vinda de mock.
interface MealRow {
  id: string;
  time: string;
  name: string;
  items: string[];
  calories: number | null;
  done: boolean;
  options: MealOption[];
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

  // WP-APP-2 2.1: SEM FALLBACK. Antes, plano ausente caía em `mealPlan` (mock) e a tela exibia
  // 5 refeições com horário e caloria que nenhum nutricionista prescreveu. O mock continua em
  // src/data/mockData.ts — só não é mais usado aqui.
  //
  // TRÊS ESTADOS DISTINTOS, nesta ordem de precedência na renderização:
  //  · planLoading (isPending: a leitura ainda não resolveu)      -> skeleton
  //  · planError   (react-query esgotou os retries; retry default -> finito, sem spinner eterno)
  //  · resolvido sem plano (null, ou plano com meals vazio)       -> NoPrescriptionYet
  // "carregando" nunca vira "não tem plano" e vice-versa: são flags diferentes da MESMA query.
  const {
    data: nutritionPlan,
    isPending: planLoading,
    isError: planError,
    refetch: refetchPlan,
  } = useQuery({ queryKey: ["nutritionPlan"], queryFn: getMyNutritionPlan });
  useEffect(() => {
    if (planError && import.meta.env.DEV) {
      console.warn("[VERTEXA Plan] failed to load real nutrition plan", planError);
    }
  }, [planError]);
  const usingRealMeals = !!(nutritionPlan && nutritionPlan.meals.length > 0);
  const meals: MealRow[] = usingRealMeals
    ? nutritionPlan!.meals.map((m) => ({ id: m.id, time: m.time, name: m.name, items: m.items, calories: m.calories, done: m.done, options: m.options ?? [] }))
    : [];
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

  // Opções de troca (tela 19): opção usada hoje por refeição e a refeição cujo painel está aberto.
  const optionsKey = ["mealOptionsToday", todayKey];
  const { data: optionToday = {} } = useQuery({ queryKey: optionsKey, queryFn: getMealOptionsToday, enabled: usingRealMeals });
  const [optionsMealId, setOptionsMealId] = useState<string | null>(null);
  const optionMutation = useMutation({
    mutationFn: ({ mealId, optionIndex }: { mealId: string; optionIndex: number }) => registerMealOption({ mealId, optionIndex }),
    onSuccess: (_d, { mealId }) => {
      if (!(doneToday?.has(mealId) ?? false)) tracker.track("meal_logged", { meal_id: mealId });
      setOptionsMealId(null);
      void qc.invalidateQueries({ queryKey: ["mealsDoneToday"] });
      void qc.invalidateQueries({ queryKey: optionsKey });
      void qc.invalidateQueries({ queryKey: ["mealAdherenceToday"] });
    },
  });

  const handleToggleMeal = (mealId: string, currentlyDone: boolean) => {
    toggleMeal.mutate({ mealId, on: !currentlyDone });
  };

  // ── Ficha de treino REAL (WP-APP-4 item 6) ────────────────────────────────────────────────
  // A aba "Treino" NÃO lia nada: mostrava um card fixo prometendo "sua ficha completa" e um botão
  // "Abrir meu treino" — mesmo para quem não tem ficha publicada. O texto AFIRMAVA a existência de
  // algo ("Veja sua ficha completa, inicie o treino do dia..."), e a paciente só descobria que não
  // havia nada depois de tocar e cair no estado vazio do /workout-guide. Agora a aba pergunta antes
  // de afirmar. MESMA query (["workoutPlan"]) que a Home e Registros já usam — cache compartilhado,
  // nenhuma leitura nova; e os MESMOS três estados da aba Alimentar: carregando / falhou / sem ficha.
  const {
    data: workoutPlan,
    isPending: workoutLoading,
    isError: workoutError,
    refetch: refetchWorkout,
  } = useQuery({ queryKey: ["workoutPlan"], queryFn: getMyWorkoutPlan });
  const hasRealWorkoutPlan = (workoutPlan?.length ?? 0) > 0;
  // "Feito" por treino na semana (segunda→hoje): conclusões reais (workout_checked/completed).
  const { data: weekCompletions } = useQuery({
    queryKey: ["weekWorkoutDone", todayKey],
    queryFn: () => getWorkoutCompletionsSince(weekStart(new Date())),
    enabled: hasRealWorkoutPlan,
  });
  const weekDoneIds = weekCompletions ? new Set(weekCompletions.map((c) => c.workoutId).filter((x): x is string => !!x)) : undefined;

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

  // Semana (tela 24 do PDF do Ernâni): marcas dos últimos 7 dias; refaz ao marcar/desmarcar.
  const { data: weekIntakes } = useQuery({
    queryKey: ["supplementsWeek", todayKey],
    queryFn: getSupplementIntakesWeek,
    enabled: supplementList.length > 0,
  });
  const week = supplementWeek(supplementList, weekIntakes ?? [], new Date());

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
      void qc.invalidateQueries({ queryKey: ["supplementsWeek"] });
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
    // "Dicas GERAIS" (WP-APP-4 item 4): as outras três abas são o plano DELA; esta não é.
    // O rótulo carrega a diferença já na navegação, antes de ela abrir.
    { key: "orientacoes", label: "Dicas gerais" },
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
              {/* CARREGANDO — ainda não sabemos se há plano. Skeleton, nunca o estado vazio.
                  Mesmo padrão já usado na aba de suplementos desta tela. */}
              {planLoading ? (
                [0, 1, 2].map((i) => <div key={i} className="h-[104px] bg-card rounded-xl animate-pulse" />)
              ) : planError && !usingRealMeals ? (
                // FALHOU a leitura — não é "sem plano". A paciente pode tentar de novo.
                // Só entra aqui sem plano em cache: refetch de fundo falho (isError com `data`
                // preservado no v5) não pode apagar o plano já exibido.
                <div className="bg-card rounded-xl p-5 flex flex-col items-center gap-2 text-center border border-dashed border-red-500/30">
                  <p className="text-xs text-red-400">Não foi possível carregar seu plano alimentar.</p>
                  <button onClick={() => refetchPlan()} className="text-[11px] font-semibold text-primary">
                    Tentar novamente
                  </button>
                </div>
              ) : !usingRealMeals ? (
                // RESOLVEU e não há plano: estado vazio honesto. Nenhuma refeição, nenhum
                // horário, nenhuma caloria — nada que o nutricionista não tenha prescrito.
                <NoPrescriptionYet
                  title={NO_MEAL_PLAN_TITLE}
                  message={NO_MEAL_PLAN_MESSAGE}
                  icon={UtensilsCrossed}
                />
              ) : (
                <>
                  {planTitle && (
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <BookOpen size={16} className="text-primary" />
                      <span className="text-sm font-semibold text-foreground">{planTitle}</span>
                    </div>
                  )}
                  {meals.map((meal) => {
                    const isDone = doneToday?.has(meal.id) ?? false;
                    return (
                      <div key={meal.id} className={`bg-card rounded-xl p-4 ${isDone ? "border border-success/20" : ""}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{meal.time}</span>
                            <span className="text-sm font-semibold text-foreground">{meal.name}</span>
                          </div>
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
                        </div>
                        {(() => {
                          const used = isDone ? (optionToday[meal.id] ?? 1) : 1;
                          const shown = allOptions(meal, meal.options).find((o) => o.index === used) ?? allOptions(meal, meal.options)[0];
                          return (
                            <>
                              <div className="flex flex-col gap-0.5 ml-6">
                                {used > 1 && <span className="text-[10px] font-semibold text-primary" data-testid="meal-used-option">Opção {used} usada hoje</span>}
                                {shown.items.map((item, j) => (<span key={j} className="text-xs text-muted-foreground">• {item}</span>))}
                              </div>
                              <div className="mt-2 ml-6 flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">{shown.calories} kcal</span>
                                {meal.options.length > 0 && (
                                  <button onClick={() => setOptionsMealId(meal.id)} className="text-[10px] text-primary font-medium">Ver opções</button>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    );
                  })}
                </>
              )}
              {meals.filter((m) => m.id === optionsMealId).map((m) => (
                <MealOptionsSheet
                  key={m.id}
                  open
                  onOpenChange={(o) => { if (!o) setOptionsMealId(null); }}
                  meal={m}
                  alternatives={m.options}
                  current={doneToday?.has(m.id) ? (optionToday[m.id] ?? 1) : 1}
                  pending={optionMutation.isPending}
                  onUse={(optionIndex) => optionMutation.mutate({ mealId: m.id, optionIndex })}
                />
              ))}
            </motion.div>
          )}

          {tab === "treino" && (
            <motion.div key="treino" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
              {/* CARREGANDO — ainda não sabemos se há ficha. Skeleton, nunca o estado vazio
                  (mesmo padrão das abas Alimentar e Suplem. desta tela). */}
              {workoutLoading ? (
                <div className="h-[124px] bg-card rounded-xl animate-pulse" />
              ) : workoutError && !hasRealWorkoutPlan ? (
                // FALHOU a leitura — não é "sem ficha". A paciente pode tentar de novo.
                <div className="bg-card rounded-xl p-5 flex flex-col items-center gap-2 text-center border border-dashed border-red-500/30">
                  <p className="text-xs text-red-400">Não foi possível carregar sua ficha de treino.</p>
                  <button onClick={() => refetchWorkout()} className="text-[11px] font-semibold text-primary">
                    Tentar novamente
                  </button>
                </div>
              ) : !hasRealWorkoutPlan ? (
                // RESOLVEU e não há ficha: o mesmo estado vazio que Registros e o /workout-guide
                // já mostram — texto ÚNICO, as três telas não podem divergir na mesma frase.
                // Sem card, sem promessa de "ficha completa", e sem botão para uma tela vazia.
                <NoPrescriptionYet
                  title={NO_WORKOUT_PLAN_TITLE}
                  message={NO_WORKOUT_PLAN_MESSAGE}
                  icon={Dumbbell}
                />
              ) : (
                <WeekWorkouts plan={workoutPlan ?? []} dow={new Date().getDay()} onOpen={(id) => navigate(id ? `/workout-guide?w=${id}` : '/workout-guide')} doneIds={weekDoneIds} />
              )}
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
                  <p className="text-xs text-muted-foreground">Nenhum suplemento ou medicamento cadastrado ainda.</p>
                  <p className="text-[10px] text-muted-foreground">Seu profissional publica a lista aqui.</p>
                </div>
              ) : (
                <>
                <WeekAdherenceCard week={week} />
                {(["supplement", "medication"] as const).map((kind) => {
                  const items = supplementList.filter((x) => (x.kind ?? "supplement") === kind);
                  if (items.length === 0) return null;
                  return (
                    <section key={kind} aria-label={kind === "medication" ? "Medicamentos" : "Suplementos"} className="flex flex-col gap-3">
                      {supplementList.some((x) => x.kind === "medication") && (
                        <h3 className="text-xs font-semibold text-muted-foreground mt-1">{kind === "medication" ? "Medicamentos" : "Suplementos"}</h3>
                      )}
                      {items.map((s) => {
                        const isTaken = supplementsTaken?.has(s.id) ?? false;
                        const reminder = reminderLabel(s.reminder_time);
                        return (
                          <div key={s.id} className={`bg-card rounded-xl p-4 flex items-center gap-3 ${isTaken ? "border border-success/20" : ""}`}>
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">{kind === "medication" ? "💊" : supplementIcon(s.name)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{s.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {[s.dose, s.time_label, reminder && `lembrete ${reminder}`].filter(Boolean).join(" • ")}
                              </p>
                              {s.brand && <p className="text-[11px] text-muted-foreground">Marca indicada: {s.brand}</p>}
                              {s.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{s.notes}</p>}
                              {week.perSupplement[s.id] && <WeekStrip flags={week.perSupplement[s.id]} days={week.days} name={s.name} />}
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
                      })}
                    </section>
                  );
                })}
                </>
              )}
            </motion.div>
          )}

          {tab === "orientacoes" && (
            <motion.div key="orientacoes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              {/* RÓTULO DE ORIGEM (WP-APP-4 item 4). As quatro orientações abaixo são literais
                  fixos deste arquivo, iguais para TODA paciente — e continuam sendo, de propósito:
                  são recomendações gerais de saúde, não deixam de ser verdadeiras por não serem
                  individualizadas. O problema era o CONTEXTO: dentro de "Meu Plano", ao lado das
                  abas Alimentar/Treino/Suplem. — que são prescrição real do profissional DELA —,
                  quatro cartões sem procedência se leem como a quinta prescrição.
                  Este bloco é o que separa as duas coisas. Não some quando houver plano real:
                  a origem do texto não muda por isso. */}
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold text-muted-foreground">Orientações gerais</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1 leading-relaxed">
                  Recomendações gerais de saúde, iguais para todos os pacientes. Não substituem a prescrição
                  da sua equipe, que está em Alimentar, Treino e Suplementos.
                </p>
              </div>
              {[
                { title: "Hidratação", Icon: Droplet, desc: "Beba pelo menos 2,5 L de água por dia, distribuídos ao longo do dia." },
                { title: "Sono reparador", Icon: Moon, desc: "Durma de 7 a 8 horas. Evite telas 1 hora antes de dormir." },
                { title: "Alimentação consciente", Icon: Utensils, desc: "Coma devagar, mastigue bem e evite distrações nas refeições." },
                { title: "Estresse", Icon: Heart, desc: "Pratique 10 minutos de respiração ou meditação por dia." },
              ].map((o, i) => (
                <div key={i} className="bg-card rounded-xl p-4 flex items-start gap-3">
                  <o.Icon size={18} className="text-primary mt-0.5 shrink-0" />
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
