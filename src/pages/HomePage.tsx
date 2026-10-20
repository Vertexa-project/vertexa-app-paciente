import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Droplets, Moon, Footprints, UtensilsCrossed, Dumbbell, Scale, Camera, HelpCircle, ChevronRight, AlertTriangle, TrendingUp, TrendingDown, Zap, Trophy, MessageCircle, CircleAlert, ImagePlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dailyGoals } from "@/data/mockData";
import { useMe } from "@/hooks/useMe";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import ComingSoonLock, { STEPS_LOCK_REASON } from "@/components/ComingSoonLock";
import NoPrescriptionYet, {
  NO_MEAL_PLAN_MESSAGE,
  VRI_NOT_AVAILABLE_TITLE,
  VRI_NOT_AVAILABLE_MESSAGE,
} from "@/components/NoPrescriptionYet";
import { getAutoActions } from "@/lib/adherenceEngine";
import { getLatestAdherenceState, getPendingSummary, getHydrationTodayLiters, getRecentSleep, getMyWorkoutPlan, getRecentWeightLogs, getMealAdherenceToday } from "@/lib/api";
import { localYmd, SLEEP_GOAL_HOURS } from "@/lib/sleep";
import ClinicBadge from "@/components/ClinicBadge";
import { tracker } from "@/lib/eventTracker";
import { pickWelcomeMessage } from "@/lib/welcomeMessages";
import BottomNav from "@/components/BottomNav";

const goalIcons: Record<string, React.ElementType> = {
  water: Droplets,
  sleep: Moon,
  steps: Footprints,
  meals: UtensilsCrossed,
  workout: Dumbbell,
};

const levelColors: Record<string, string> = {
  alta: "text-success",
  moderada: "text-warning",
  baixa: "text-destructive",
  risco: "text-destructive",
};

const levelBg: Record<string, string> = {
  alta: "bg-success/10 border-success/20",
  moderada: "bg-warning/10 border-warning/20",
  baixa: "bg-destructive/10 border-destructive/20",
  risco: "bg-destructive/10 border-destructive/20",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  novo: { label: 'Novo', color: 'bg-primary/20 text-primary' },
  em_acompanhamento: { label: 'Em acompanhamento', color: 'bg-success/20 text-success' },
  atencao: { label: 'Atenção', color: 'bg-warning/20 text-warning' },
  em_risco: { label: 'Em risco', color: 'bg-destructive/20 text-destructive' },
  inativo: { label: 'Inativo', color: 'bg-muted text-muted-foreground' },
};

const phaseLabels: Record<string, string> = {
  inicio: 'Início da jornada',
  constancia_inicial: 'Constância inicial',
  acompanhamento_ativo: 'Acompanhamento ativo',
  revisao_progresso: 'Revisão de progresso',
  manutencao: 'Manutenção',
};

function VRIRing({ score, level }: { score: number; level: string }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const strokeColor = level === 'alta' ? "hsl(var(--success))" : level === 'moderada' ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  const levelLabel = level === 'alta' ? 'Alta adesão' : level === 'moderada' ? 'Adesão moderada' : level === 'baixa' ? 'Baixa adesão' : 'Risco';

  return (
    <div className="relative flex items-center justify-center">
      <svg width="130" height="130" className="-rotate-90">
        <circle cx="65" cy="65" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
        <motion.circle
          cx="65" cy="65" r={r} fill="none" stroke={strokeColor} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-display font-bold text-foreground">{score}%</span>
        <span className={`text-[10px] font-semibold ${levelColors[level]}`}>{levelLabel}</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  // VRI exibido = ÚLTIMO snapshot persistido (mesma fonte que a web → consistência app↔web).
  //
  // WP-APP-6 item 3.2 — O QUE SAIU DAQUI: `?? getAdherenceState()`. Sem argumento, essa chamada
  // cai no DEFAULT_CONFIG do motor (adherenceEngine.ts:67-75) — a configuração de EXEMPLO do
  // módulo — e a Home renderizava o resultado como se fosse o índice da paciente: 95%, "Alta
  // adesão", "+3", "18 dias de sequência", "60% da semana", "Você está arrasando! 🔥" e a ação
  // automática "Você está incrível! Sua adesão está excelente". Para quem nunca registrou nada.
  // Idêntico ao que o WP-APP-4 tirou do Perfil, e sobrevivia na PRIMEIRA tela que ela abre.
  // Não era caso de borda: medido em produção, 6 das 7 pacientes caem neste caminho hoje
  // (adherence_snapshots tem 1 linha, de 1 paciente).
  //
  // O `??` ainda tratava TRÊS situações diferentes como a mesma, e todas viravam 95%:
  //   carregando (data undefined) · resolveu sem snapshot (data null) · ERRO (data undefined).
  // A terceira era a pior: uma falha de leitura virava um índice saudável, sem sinal nenhum.
  // Agora são três ramos distintos no render — skeleton / vazio honesto / falha com retry —
  // e `state` pode ser null, que é a verdade quando não há snapshot.
  const adherenceQuery = useQuery({ queryKey: ["adherence"], queryFn: getLatestAdherenceState });
  const state = adherenceQuery.data ?? null;
  // `isPending` e NÃO `isLoading`: em react-query v5, `isLoading === isPending && isFetching`.
  // Offline (fetchStatus 'paused') o isLoading é false com data undefined — uma guarda por
  // isLoading afirmaria "você não tem índice" quando o app está é sem rede. Segue o Perfil.
  const adherenceLoading = adherenceQuery.isPending;
  // Sem state não há ação derivável. A guarda fica AQUI, na chamada, e não dentro do motor.
  const autoActions = state ? getAutoActions(state) : [];
  const statusInfo = state ? statusLabels[state.status] ?? statusLabels["em_acompanhamento"] : null;

  useEffect(() => { tracker.track('home_viewed'); }, []);

  const { me, isLoading: meLoading } = useMe();

  // Água de hoje (soma do dia) para a meta de hidratação — dado real.
  const hydrationToday = useQuery({ queryKey: ["hydrationToday"], queryFn: getHydrationTodayLiters });
  const recentSleep = useQuery({ queryKey: ["recentSleep"], queryFn: () => getRecentSleep(1) });
  // Sono de hoje = registro cujo dia (em que acordou) é hoje; sem registro, 0 (a meta ainda não foi cumprida).
  const sleepTodayHours = recentSleep.data?.find((r) => r.slept_on === localYmd())?.hours ?? 0;

  // Peso "atual" exibido vem do último weight_log (auto-reporte do app) quando existir, senão
  // do patients.current_weight (avaliação clínica). Reflete na Home o peso recém-registrado.
  const recentWeights = useQuery({ queryKey: ["recentWeights"], queryFn: () => getRecentWeightLogs(6) });
  const latestLoggedWeight = recentWeights.data?.[0]?.weight_kg != null ? Number(recentWeights.data[0].weight_kg) : null;
  const currentWeight = latestLoggedWeight ?? me.currentWeight;

  // Pendências derivadas de dados REAIS (objetivo #6): nada de pending:true hardcoded.
  const pendingQuery = useQuery({ queryKey: ["pendingSummary"], queryFn: getPendingSummary });
  const pending = pendingQuery.data;

  // Badge de notificações NÃO lidas (real; fim do ponto estático). Zera ao marcar lidas em /notifications.
  const { count: unreadNotifications } = useUnreadNotificationCount();

  // Adesão alimentar do dia (meal_logs vs plano ativo) — meta "Refeições" real + pendência.
  const mealAdherenceQuery = useQuery({ queryKey: ["mealAdherenceToday"], queryFn: getMealAdherenceToday });
  const mealAdherence = mealAdherenceQuery.data;
  const hasRealMealPlan = !!(mealAdherence && mealAdherence.total > 0);

  // Nome do treino de hoje para a pendência. WP-APP-2 2.1: SEM FALLBACK ao mock — antes, sem
  // ficha publicada, a pendência dizia "Treino A — Costas e Bíceps", nome de um treino que
  // nenhum profissional prescreveu.
  const { data: realPlan } = useQuery({ queryKey: ["workoutPlan"], queryFn: getMyWorkoutPlan });
  const schedule = realPlan ?? [];
  const hasRealWorkoutPlan = schedule.length > 0;
  const todayWorkout = schedule.find((w) => w.dayIndex === new Date().getDay()) ?? schedule[0];
  const todayWorkoutLabel = todayWorkout ? `Treino ${todayWorkout.letter} — ${todayWorkout.name}` : "";

  // Metas do dia: água, treino e refeições refletem dados reais. Sono e passos estão bloqueados.
  const goals = dailyGoals.map((g) => {
    if (g.id === "water") return { ...g, current: hydrationToday.data ?? g.current };
    if (g.id === "sleep") return { ...g, current: sleepTodayHours, target: SLEEP_GOAL_HOURS };
    if (g.id === "workout") return { ...g, current: pending && !pending.workoutPending ? 1 : 0 };
    // Refeições: current=done, target=total do plano ativo. Sem plano real NÃO cai mais no mock
    // (3/5 refeições que ninguém prescreveu) — a linha vira estado vazio honesto na renderização.
    if (g.id === "meals") return hasRealMealPlan ? { ...g, current: mealAdherence!.done, target: mealAdherence!.total } : g;
    return g;
  });

  // Metas BLOQUEADAS — exibidas com cadeado e fora do contador de "concluídas".
  //  · steps (WP-APP-1): 6.420/8.000 fixo em mockData, sem origem real.
  const LOCKED_GOAL_IDS = new Set(["steps"]);
  // Refeições sem plano publicado também sai do denominador: não é meta que a paciente possa
  // cumprir hoje, e contá-la deixaria "X/5" permanentemente incompleto por culpa do sistema.
  const countableGoals = goals.filter(
    (g) => !LOCKED_GOAL_IDS.has(g.id) && !(g.id === "meals" && !hasRealMealPlan),
  );

  const pendingItems = [
    {
      id: "photo",
      icon: ImagePlus,
      title: "Foto mensal pendente",
      subtitle: pending?.photoDaysAgo != null ? `Última foto: há ${pending.photoDaysAgo} dias` : "Nenhuma foto enviada ainda",
      cta: "Enviar agora",
      path: "/records",
      pending: pending?.photoPending ?? false,
    },
    {
      id: "workout",
      icon: Dumbbell,
      title: "Treino do dia não concluído",
      subtitle: todayWorkoutLabel,
      cta: "Iniciar treino",
      path: "/workout-guide",
      // `pending.workoutPending` só sabe que não houve workout_checked hoje — não sabe se existe
      // ficha. Sem plano publicado, não há treino a concluir: cobrar por ele seria cobrar conduta
      // não prescrita. Mesmo critério que a pendência de refeições já usava (`hasRealMealPlan`).
      // Enquanto a leitura carrega, `hasRealWorkoutPlan` é false e a pendência fica fora — a
      // ausência momentânea de um item é honesta; afirmar um treino inexistente não é.
      pending: hasRealWorkoutPlan && (pending?.workoutPending ?? false),
    },
    {
      id: "weight",
      icon: Scale,
      title: "Registro de peso atrasado",
      subtitle: pending?.weightDaysAgo != null ? `Último registro: há ${pending.weightDaysAgo} dias` : "Nenhum registro de peso ainda",
      cta: "Registrar",
      path: "/records",
      pending: pending?.weightPending ?? false,
    },
    {
      id: "meals",
      icon: UtensilsCrossed,
      title: "Refeições de hoje não registradas",
      subtitle: hasRealMealPlan ? `${mealAdherence!.done}/${mealAdherence!.total} refeições marcadas` : "Marque suas refeições do dia",
      cta: "Marcar",
      path: "/plan",
      // Some quando done>0 (ou sem plano real): só é pendência se há plano e nada foi marcado hoje.
      pending: hasRealMealPlan && mealAdherence!.done === 0,
    },
  ].filter(item => item.pending);

  const quickActions = [
    { icon: Scale, label: "Peso", path: "/records" },
    { icon: Dumbbell, label: "Treino", path: "/records" },
    { icon: Droplets, label: "Água", path: "/habits" },
    { icon: Camera, label: "Foto", path: "/records" },
    { icon: MessageCircle, label: "Equipe", path: "/team-chat" },
    { icon: HelpCircle, label: "SOS", path: "/sos" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <ClinicBadge className="mb-4" />
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">{meLoading ? <Skeleton className="inline-block h-6 w-3/4 max-w-[260px] align-middle rounded" /> : pickWelcomeMessage({ name: me.name })} 👋</h1>
            {/* Frase de coaching DERIVADA do score (adherenceEngine.ts:169-177). Sem score não
                há do que derivar: sem snapshot ela dizia "Você está arrasando! 🔥" para quem
                nunca registrou nada. A saudação acima é real (me.name) e fica. */}
            {state && <p className="text-sm text-muted-foreground mt-0.5">{state.contextualMessage}</p>}
          </div>
          <button onClick={() => navigate("/notifications")} className="relative w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <Bell size={20} className="text-foreground" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1 border-2 border-background">
                {unreadNotifications}
              </span>
            )}
          </button>
        </motion.div>

        {/* Status badge + journey phase */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex items-center gap-2 mb-5">
          {/* "Em acompanhamento" e "Acompanhamento ativo" são rótulos quase-clínicos, e sem
              snapshot os dois vinham do DEFAULT_CONFIG. Só os DOIS SPANS somem — o botão "Ver
              jornada" é navegação real, não depende de `state`, e continua (o ml-auto dele já
              o mantém alinhado sozinho). */}
          {state && statusInfo && (
            <>
              <span className={`px-3 py-1 rounded-full text-[10px] font-semibold ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">{phaseLabels[state.journeyPhase]}</span>
            </>
          )}
          <button onClick={() => navigate("/journey")} className="ml-auto text-[10px] text-primary font-medium flex items-center gap-0.5">
            Ver jornada <ChevronRight size={12} />
          </button>
        </motion.div>

        {/* Pending Actions */}
        {pendingItems.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <CircleAlert size={14} className="text-destructive" />
              <h2 className="text-sm font-display font-semibold text-foreground">Pendências</h2>
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                {pendingItems.length} {pendingItems.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <div className="space-y-2.5">
              {pendingItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.06 }}
                    onClick={() => navigate(item.path)}
                    className="relative flex items-center gap-3 p-3.5 rounded-xl bg-card border border-destructive/25 cursor-pointer active:scale-[0.98] transition-all overflow-hidden group"
                  >
                    {/* Subtle left accent bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-destructive/60 rounded-l-xl" />
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <Icon size={20} className="text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-destructive whitespace-nowrap group-hover:text-destructive/80 transition-colors">
                      {item.cta}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* VRI Score Card — QUATRO estados distintos, na ordem de precedência (WP-APP-6 3.2).
            Este é o único bloco que NÃO some sem snapshot: o assunto dele É o índice, e um
            buraco no topo da tela deixaria a paciente sem saber se o app quebrou. */}
        {adherenceLoading ? (
          // CARREGANDO — nunca o estado vazio. Afirmar "não há índice" antes de a leitura
          // resolver seria mentir na direção contrária (regra do NoPrescriptionYet).
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-6 shadow-card mb-5"
          >
            <div className="h-[130px] rounded-xl bg-muted animate-pulse" />
          </motion.div>
        ) : adherenceQuery.isError ? (
          // FALHOU a leitura. Antes deste WP, ERRO caía no mesmo `??` e virava 95% "Alta
          // adesão": a falha se disfarçava de saúde. Falha ≠ "não tem" ≠ número bonito.
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-5 shadow-card mb-5 flex flex-col items-center gap-2 text-center border border-dashed border-red-500/30"
          >
            <p className="text-xs text-red-400">Não foi possível carregar seu índice VRI.</p>
            <button onClick={() => adherenceQuery.refetch()} className="text-[11px] font-semibold text-primary">
              Tentar novamente
            </button>
          </motion.div>
        ) : !state ? (
          // RESOLVEU e não há snapshot: estado vazio honesto, sem número nenhum.
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-5">
            <NoPrescriptionYet
              title={VRI_NOT_AVAILABLE_TITLE}
              message={VRI_NOT_AVAILABLE_MESSAGE}
              icon={TrendingUp}
            />
          </motion.div>
        ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-6 shadow-card mb-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-muted-foreground">Índice VRI</p>
                {/* PÍLULA DE VARIAÇÃO — só existe quando HÁ variação (WP-APP-7 item 2.2).
                    ANTES ela era incondicional, e `lastScoreChange` vale 0 justamente quando
                    NÃO HÁ medição anterior: `adherenceStateFromSnapshot` faz
                    `prevScore === undefined ? 0 : latest.score - prevScore`. Como a RPC
                    `recompute_adherence` só grava quando o score ou o nível MUDAM, a segunda
                    linha demora — então "+0" com seta de ALTA em VERDE era o que TODA paciente
                    via na sua PRIMEIRA medição real. Afirmava uma subida que não houve, e o
                    verde dizia "melhorou" no exato momento em que não havia com o que comparar.
                    Ausência de pílula não afirma nada: é o que se sabe quando não se sabe.
                    (O mesmo vale para o zero verdadeiro — score igual e nível diferente. Não
                    há variação a mostrar nos dois casos, e o silêncio serve aos dois.)
                    A SETA também deixou de mentir: era `TrendingUp` inclusive para queda —
                    vermelho, mas apontando para cima. Agora a direção acompanha o sinal. */}
                {state.lastScoreChange !== 0 && (
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${state.lastScoreChange > 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {state.lastScoreChange > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {state.lastScoreChange > 0 ? '+' : ''}{state.lastScoreChange}
                  </div>
                )}
              </div>
              <p className="text-sm text-foreground">{state.score >= 80 ? 'Excelente! Sua constância está ótima.' : state.score >= 50 ? 'Bom ritmo. Continue registrando.' : 'Vamos retomar sua rotina?'}</p>
              {/* BARRA SEMANAL REMOVIDA (WP-APP-4 item 1) — não havia o que derivar.
                  As sete caixinhas Seg→Dom vinham de `weeklyProgress.days` (mockData.ts:22-34):
                  90, 85, 70, 75, 60, 0, 0 — literais versionados no repo, iguais para toda
                  paciente e em todo dia da semana. Ficavam ENCOSTADAS no anel do VRI, que é
                  real (snapshot do servidor): o número verdadeiro emprestava credibilidade
                  ao falso, e a paciente não tinha como saber qual era qual.
                  NÃO foi substituída por um equivalente real porque ele NÃO EXISTE: a única
                  origem possível de um score POR DIA seria `adherence_snapshots`, e ela não é
                  uma série diária — `recompute_adherence` só grava QUANDO o score ou o nível
                  MUDAM (skip-if-unchanged no fim da função) e não há cron diário nenhum
                  (o único job agendado é `recompute_recovery_decay`). Medido em produção:
                  1 linha em toda a tabela. Derivar sete dias disso seria inventar de novo,
                  agora com cara de dado. Dado real ou nada — e aqui é nada.
                  Quando existir histórico diário de verdade, o bloco volta AQUI. */}
            </div>
            <VRIRing score={state.score} level={state.level} />
          </div>
          {/* Streak */}
          <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
            <Zap size={14} className="text-primary" />
            <span className="text-xs text-foreground font-medium">{state.streak} dias de sequência</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{state.weeklyCompletionRate}% da semana</span>
          </div>
        </motion.div>
        )}

        {/* Risk / Attention Alert */}
        {state && state.riskFactors.length > 0 && state.level !== 'alta' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className={`rounded-2xl p-4 mb-5 border ${levelBg[state.level]}`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className={levelColors[state.level]} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${levelColors[state.level]}`}>
                  {state.level === 'risco' ? 'Atenção necessária' : 'Pontos de atenção'}
                </p>
                {state.riskFactors.map((f, i) => (
                  <p key={i} className="text-xs text-muted-foreground mt-0.5">• {f}</p>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Auto actions (simulated system intelligence) */}
        {autoActions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mb-5">
            {autoActions.slice(0, 2).map((action) => (
              <div key={action.id} className="bg-card rounded-xl p-3.5 flex items-center gap-3 mb-2">
                <span className="text-xl">{action.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{action.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{action.message}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </div>
            ))}
          </motion.div>
        )}

        {/* Challenge Group */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          onClick={() => navigate('/challenges')}
          className="mb-5 p-4 rounded-2xl bg-card border border-border cursor-pointer hover:border-primary/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Trophy size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Desafio Constância Abril</p>
              <p className="text-xs text-muted-foreground">#4 no ranking · 1.060 pts</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
        </motion.div>

        {/* Daily Goals */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-display font-semibold text-foreground">Metas do dia</h2>
            {/* O contador ignora as metas bloqueadas: contar no denominador uma meta que a
                paciente não tem como cumprir (nem enxergar) transformaria o cadeado numa
                pendência permanente. */}
            <span className="text-xs text-primary font-medium">{countableGoals.filter(g => g.current >= g.target).length}/{countableGoals.length} concluídas</span>
          </div>
          <div className="grid grid-cols-1 gap-3 mb-5">
            {goals.map((goal, i) => {
              // Passos BLOQUEADO (WP-APP-1): `dailyGoals` traz 6.420/8.000 fixo de mockData —
              // não vem de aparelho nem de tabela. Cadeado no lugar do número, na MESMA posição
              // da lista. A entrada segue em `goals` (não apagada) para voltar quando houver dado.
              if (goal.id === "steps") {
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.05 }}
                  >
                    {/* Ícone passado direto (e não por `goalIcons`, que é Record<string,
                        React.ElementType>) para o componente manter o tipo LucideIcon. */}
                    <ComingSoonLock title={goal.label} reason={STEPS_LOCK_REASON} icon={Footprints} variant="row" />
                  </motion.div>
                );
              }
              // Refeições SEM PLANO PUBLICADO (WP-APP-2 2.1): `dailyGoals` traz 3/5 fixo. Não é
              // "em breve" — a funcionalidade existe e roda; falta o nutricionista prescrever.
              // Por isso NoPrescriptionYet, e não o cadeado.
              if (goal.id === "meals" && !hasRealMealPlan) {
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.05 }}
                  >
                    <NoPrescriptionYet
                      title={goal.label}
                      message={NO_MEAL_PLAN_MESSAGE}
                      icon={UtensilsCrossed}
                      variant="row"
                    />
                  </motion.div>
                );
              }
              const pct = Math.min((goal.current / goal.target) * 100, 100);
              const Icon = goalIcons[goal.id] || Droplets;
              const isDone = goal.current >= goal.target;
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.05 }}
                  className={`flex items-center gap-3 p-3.5 rounded-xl ${
                    isDone 
                      ? "bg-success/10 border border-success/20" 
                      : pct > 0 
                        ? "bg-card border border-border" 
                        : "bg-card border border-destructive/20"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDone ? "bg-success/20" : "bg-muted"}`}>
                    <Icon size={20} className={isDone ? "text-success" : pct === 0 ? "text-destructive/70" : "text-muted-foreground"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{goal.label}</span>
                      <span className="text-xs text-muted-foreground">{goal.current}{goal.unit}/{goal.target}{goal.unit}</span>
                    </div>
                    {!isDone && pct === 0 && (
                      <span className="text-[9px] font-semibold text-destructive/80 mb-0.5">Pendente</span>
                    )}
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${isDone ? "bg-success" : "gradient-orange"}`}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.05 }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h2 className="text-base font-display font-semibold text-foreground mb-3">Ações rápidas</h2>
          <div className="flex gap-3 mb-5 overflow-x-auto pb-1">
            {quickActions.map((a) => (
              <button key={a.label} onClick={() => navigate(a.path)} className="flex flex-col items-center gap-2 min-w-[64px]">
                <div className="w-14 h-14 rounded-2xl bg-card flex items-center justify-center active:scale-95 transition-transform">
                  <a.icon size={22} className="text-primary" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">{a.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Weight Evolution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="bg-card rounded-2xl p-5 shadow-card mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Evolução do peso</h3>
              <button onClick={() => navigate("/progress")} className="text-xs text-primary font-medium flex items-center gap-0.5">
                Ver mais <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex items-end gap-2">
              {meLoading ? <Skeleton className="h-9 w-20 rounded" /> : <span className="text-3xl font-display font-bold text-foreground">{currentWeight ?? "--"}</span>}
              <span className="text-sm text-muted-foreground mb-1">kg</span>
              {me.startWeight != null && currentWeight != null && <span className="text-xs text-success font-medium mb-1 ml-auto">-{(me.startWeight - currentWeight).toFixed(1)}kg</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Meta: {me.targetWeight ?? "--"}kg • Início: {me.startWeight ?? "--"}kg</p>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full gradient-orange"
                initial={{ width: 0 }}
                animate={{ width: `${me.startWeight != null && currentWeight != null && me.targetWeight != null && me.startWeight !== me.targetWeight ? Math.max(0, Math.min(100, ((me.startWeight - currentWeight) / (me.startWeight - me.targetWeight)) * 100)) : 0}%` }}
                transition={{ duration: 1, delay: 0.6 }}
              />
            </div>
          </div>
        </motion.div>

      </div>
      <BottomNav />
    </div>
  );
}
