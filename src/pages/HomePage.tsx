import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Droplets, Moon, Footprints, UtensilsCrossed, Dumbbell, Scale, Camera, HelpCircle, ChevronRight, AlertTriangle, TrendingUp, Zap, Trophy, MessageCircle, CircleAlert, ImagePlus, ClipboardCheck, CalendarClock } from "lucide-react";
import { dailyGoals, weeklyProgress } from "@/data/mockData";
import { useMe } from "@/hooks/useMe";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdherenceState, getAutoActions } from "@/lib/adherenceEngine";
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
  const state = getAdherenceState();
  const autoActions = getAutoActions(state);
  const statusInfo = statusLabels[state.status];

  useEffect(() => { tracker.track('home_viewed'); }, []);

  const { me, isLoading: meLoading } = useMe();

  // Pending actions logic
  const pendingItems = [
    {
      id: "photo",
      icon: ImagePlus,
      title: "Foto mensal pendente",
      subtitle: "Última foto: há 34 dias",
      cta: "Enviar agora",
      path: "/records",
      pending: true,
    },
    {
      id: "workout",
      icon: Dumbbell,
      title: "Treino do dia não concluído",
      subtitle: "Treino C — Full Body",
      cta: "Iniciar treino",
      path: "/workout-guide",
      pending: !dailyGoals.find(g => g.id === "workout")?.done && (dailyGoals.find(g => g.id === "workout")?.current ?? 0) < (dailyGoals.find(g => g.id === "workout")?.target ?? 1),
    },
    {
      id: "weight",
      icon: Scale,
      title: "Registro de peso atrasado",
      subtitle: "Último registro: há 5 dias",
      cta: "Registrar",
      path: "/records",
      pending: true,
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
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">{meLoading ? <Skeleton className="inline-block h-6 w-3/4 max-w-[260px] align-middle rounded" /> : pickWelcomeMessage({ name: me.name })} 👋</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{state.contextualMessage}</p>
          </div>
          <button onClick={() => navigate("/notifications")} className="relative w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <Bell size={20} className="text-foreground" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
          </button>
        </motion.div>

        {/* Status badge + journey phase */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex items-center gap-2 mb-5">
          <span className={`px-3 py-1 rounded-full text-[10px] font-semibold ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          <span className="text-[10px] text-muted-foreground">•</span>
          <span className="text-[10px] text-muted-foreground">{phaseLabels[state.journeyPhase]}</span>
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

        {/* VRI Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-6 shadow-card mb-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-muted-foreground">Índice VRI</p>
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${state.lastScoreChange >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  <TrendingUp size={10} />
                  {state.lastScoreChange >= 0 ? '+' : ''}{state.lastScoreChange}
                </div>
              </div>
              <p className="text-sm text-foreground mb-3">{state.score >= 80 ? 'Excelente! Sua constância está ótima.' : state.score >= 50 ? 'Bom ritmo. Continue registrando.' : 'Vamos retomar sua rotina?'}</p>
              <div className="flex gap-1">
                {weeklyProgress.days.map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-semibold ${
                      d.done ? "gradient-orange text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {d.score > 0 ? d.score : "—"}
                    </div>
                    <span className="text-[9px] text-muted-foreground">{d.day}</span>
                  </div>
                ))}
              </div>
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

        {/* Risk / Attention Alert */}
        {state.riskFactors.length > 0 && state.level !== 'alta' && (
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
            <span className="text-xs text-primary font-medium">{dailyGoals.filter(g => g.current >= g.target).length}/{dailyGoals.length} concluídas</span>
          </div>
          <div className="grid grid-cols-1 gap-3 mb-5">
            {dailyGoals.map((goal, i) => {
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
              {meLoading ? <Skeleton className="h-9 w-20 rounded" /> : <span className="text-3xl font-display font-bold text-foreground">{me.currentWeight ?? "--"}</span>}
              <span className="text-sm text-muted-foreground mb-1">kg</span>
              {me.startWeight != null && me.currentWeight != null && <span className="text-xs text-success font-medium mb-1 ml-auto">-{(me.startWeight - me.currentWeight).toFixed(1)}kg</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Meta: {me.targetWeight ?? "--"}kg • Início: {me.startWeight ?? "--"}kg</p>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full gradient-orange"
                initial={{ width: 0 }}
                animate={{ width: `${me.startWeight != null && me.currentWeight != null && me.targetWeight != null && me.startWeight !== me.targetWeight ? Math.max(0, Math.min(100, ((me.startWeight - me.currentWeight) / (me.startWeight - me.targetWeight)) * 100)) : 0}%` }}
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
