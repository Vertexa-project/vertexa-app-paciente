import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calendar, Image, TrendingDown, TrendingUp, Flame, Dumbbell, Timer, BarChart3, Layers, ChevronRight, Zap, Activity, Camera, X, ArrowRight, Plus, Watch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { weightHistory, achievements, patient } from "@/data/mockData";
import { getAdherenceState } from "@/lib/adherenceEngine";
import { tracker } from "@/lib/eventTracker";
import BottomNav from "@/components/BottomNav";

type Period = "7d" | "14d" | "28d";

const periodLabels: Record<Period, string> = { "7d": "7 dias", "14d": "14 dias", "28d": "28 dias" };

type MuscleStatus = "fatigued" | "recovering" | "neutral" | "activated";

interface MuscleRegion {
  id: string;
  name: string;
  status: MuscleStatus;
  intensity: number; // 0-100
  side: "front" | "back" | "both";
  lastTrained?: string;
}

const muscleRegions: MuscleRegion[] = [
  { id: "chest", name: "Peitoral", status: "recovering", intensity: 72, side: "front", lastTrained: "Ontem" },
  { id: "shoulders", name: "Ombros", status: "recovering", intensity: 65, side: "front", lastTrained: "Ontem" },
  { id: "biceps", name: "Bíceps", status: "fatigued", intensity: 88, side: "front", lastTrained: "Hoje" },
  { id: "triceps", name: "Tríceps", status: "fatigued", intensity: 82, side: "front", lastTrained: "Hoje" },
  { id: "abs", name: "Abdômen", status: "neutral", intensity: 25, side: "front" },
  { id: "quads", name: "Quadríceps", status: "activated", intensity: 90, side: "front", lastTrained: "Hoje" },
  { id: "upperback", name: "Costas alta", status: "neutral", intensity: 30, side: "back" },
  { id: "lats", name: "Dorsais", status: "recovering", intensity: 68, side: "back", lastTrained: "2 dias" },
  { id: "lowerback", name: "Lombar", status: "neutral", intensity: 20, side: "back" },
  { id: "glutes", name: "Glúteos", status: "activated", intensity: 85, side: "back", lastTrained: "Hoje" },
  { id: "hamstrings", name: "Posteriores", status: "recovering", intensity: 60, side: "back", lastTrained: "2 dias" },
  { id: "calves", name: "Panturrilha", status: "neutral", intensity: 15, side: "back" },
];

const statusConfig: Record<MuscleStatus, { color: string; glow: string; label: string; dot: string }> = {
  fatigued: { color: "hsl(0, 85%, 60%)", glow: "hsl(0, 85%, 60%)", label: "Fadiga alta", dot: "bg-red-500" },
  recovering: { color: "hsl(35, 95%, 55%)", glow: "hsl(25, 95%, 53%)", label: "Em recuperação", dot: "bg-amber-500" },
  neutral: { color: "hsl(220, 10%, 40%)", glow: "hsl(220, 10%, 40%)", label: "Baixo estímulo", dot: "bg-muted-foreground/40" },
  activated: { color: "hsl(25, 95%, 53%)", glow: "hsl(25, 95%, 53%)", label: "Muito ativado", dot: "bg-primary" },
};

// Mock muscle data for the detail list
const muscleGroups = [
  { name: "Quadríceps", front: true, pct: 90, status: "activated" as const },
  { name: "Bíceps", front: true, pct: 88, status: "fatigued" as const },
  { name: "Glúteos", front: false, pct: 85, status: "activated" as const },
  { name: "Triceps", front: true, pct: 82, status: "fatigued" as const },
  { name: "Peitoral", front: true, pct: 72, status: "recovering" as const },
  { name: "Dorsais", front: false, pct: 68, status: "recovering" as const },
  { name: "Ombros", front: true, pct: 65, status: "recovering" as const },
  { name: "Posteriores", front: false, pct: 60, status: "recovering" as const },
];

const statusColors = {
  recovered: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Recuperado" },
  recovering: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Em recuperação" },
  fatigued: { bg: "bg-red-500/20", text: "text-red-400", label: "Fadiga alta" },
  activated: { bg: "bg-primary/20", text: "text-primary", label: "Muito ativado" },
  weak: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Enfraquecido" },
};

const exerciseTypes = [
  { name: "Compostos", pct: 55, color: "bg-primary" },
  { name: "Isolados", pct: 30, color: "bg-emerald-500" },
  { name: "Cardio", pct: 15, color: "bg-amber-500" },
];

const weeklyVolume = [
  { week: "S1", vol: 4200 },
  { week: "S2", vol: 5100 },
  { week: "S3", vol: 4800 },
  { week: "S4", vol: 5600 },
];

const periodStats: Record<Period, { workouts: number; time: string; calories: number; exercises: number; sets: number; reps: number; load: string }> = {
  "7d": { workouts: 4, time: "03:45", calories: 1840, exercises: 32, sets: 96, reps: 1120, load: "12.4t" },
  "14d": { workouts: 9, time: "08:12", calories: 4120, exercises: 71, sets: 213, reps: 2480, load: "27.8t" },
  "28d": { workouts: 17, time: "15:30", calories: 7650, exercises: 136, sets: 408, reps: 4760, load: "52.1t" },
};

// Mock complementary activities
const recentActivities = [
  { id: "1", modality: "Corrida", icon: "🏃", duration: 35, calories: 385, date: "Hoje", source: "manual" as const },
  { id: "2", modality: "Jiu-Jitsu", icon: "🥋", duration: 60, calories: 720, date: "Ontem", source: "manual" as const },
  { id: "3", modality: "Caminhada", icon: "🚶", duration: 45, calories: 225, date: "Ter", source: "device" as const },
];

function PremiumBodyMap({ side, regions }: { side: "front" | "back"; regions: MuscleRegion[] }) {
  const sideRegions = regions.filter(r => r.side === side || r.side === "both");
  
  const getRegionStyle = (regionId: string) => {
    const region = sideRegions.find(r => r.id === regionId);
    if (!region) return { fill: "hsl(220, 10%, 18%)", opacity: 0.15 };
    const cfg = statusConfig[region.status];
    const opacityBase = region.status === "neutral" ? 0.12 : 0.25 + (region.intensity / 100) * 0.55;
    return { fill: cfg.color, opacity: opacityBase };
  };

  const frontMuscles = [
    // Shoulders
    { id: "shoulders", d: "M28,38 Q22,36 20,42 L20,48 Q24,46 30,44 Z", mirror: true },
    // Chest
    { id: "chest", d: "M30,44 Q38,42 50,42 Q62,42 70,44 L70,56 Q62,58 50,58 Q38,58 30,56 Z" },
    // Biceps
    { id: "biceps", d: "M18,50 Q14,52 14,62 L14,72 Q18,70 20,66 L20,50 Z", mirror: true },
    // Triceps (front view, inner arm)
    { id: "triceps", d: "M20,50 L22,50 L22,66 Q20,70 18,72 L18,68 L20,66 Z", mirror: true },
    // Abs
    { id: "abs", d: "M36,58 L64,58 L62,82 Q50,84 38,82 Z" },
    // Quads
    { id: "quads", d: "M30,84 L46,84 L44,118 Q38,120 32,118 Z", mirror: true },
  ];

  const backMuscles = [
    // Upper back / traps
    { id: "upperback", d: "M30,38 Q40,36 50,36 Q60,36 70,38 L68,48 Q50,46 32,48 Z" },
    // Lats
    { id: "lats", d: "M28,48 L32,48 Q38,56 36,68 L28,68 Z", mirror: true },
    // Lower back
    { id: "lowerback", d: "M36,68 L64,68 L62,82 Q50,84 38,82 Z" },
    // Glutes
    { id: "glutes", d: "M32,82 L68,82 L66,96 Q50,100 34,96 Z" },
    // Hamstrings
    { id: "hamstrings", d: "M32,98 L46,98 L44,130 Q38,132 34,130 Z", mirror: true },
    // Calves
    { id: "calves", d: "M34,132 L44,132 L42,152 Q38,154 36,152 Z", mirror: true },
  ];

  const muscles = side === "front" ? frontMuscles : backMuscles;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 170" className="w-full max-w-[140px]" style={{ filter: "drop-shadow(0 0 12px hsla(25, 95%, 53%, 0.08))" }}>
        {/* Base body silhouette */}
        <defs>
          <linearGradient id={`bodyGrad-${side}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(220, 15%, 22%)" />
            <stop offset="100%" stopColor="hsl(220, 12%, 16%)" />
          </linearGradient>
          <filter id={`glow-${side}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Head */}
        <ellipse cx="50" cy="14" rx="10" ry="12" fill={`url(#bodyGrad-${side})`} stroke="hsl(220, 15%, 28%)" strokeWidth="0.5" />
        {/* Neck */}
        <rect x="45" y="26" width="10" height="8" rx="3" fill={`url(#bodyGrad-${side})`} />
        {/* Torso */}
        <path d="M28,34 Q28,32 32,32 L68,32 Q72,32 72,34 L74,82 Q74,86 68,86 L32,86 Q26,86 26,82 Z" fill={`url(#bodyGrad-${side})`} stroke="hsl(220, 15%, 28%)" strokeWidth="0.4" />
        {/* Arms */}
        <path d="M26,36 Q18,34 14,42 L12,72 Q12,76 16,76 L20,76 Q22,76 22,72 L24,48 Z" fill={`url(#bodyGrad-${side})`} stroke="hsl(220, 15%, 28%)" strokeWidth="0.4" />
        <path d="M74,36 Q82,34 86,42 L88,72 Q88,76 84,76 L80,76 Q78,76 78,72 L76,48 Z" fill={`url(#bodyGrad-${side})`} stroke="hsl(220, 15%, 28%)" strokeWidth="0.4" />
        {/* Pelvis */}
        <path d="M30,82 L70,82 L68,96 Q50,100 32,96 Z" fill={`url(#bodyGrad-${side})`} stroke="hsl(220, 15%, 28%)" strokeWidth="0.4" />
        {/* Legs */}
        <path d="M30,96 L48,96 L46,148 Q46,154 42,156 L34,156 Q30,154 30,148 Z" fill={`url(#bodyGrad-${side})`} stroke="hsl(220, 15%, 28%)" strokeWidth="0.4" />
        <path d="M52,96 L70,96 L70,148 Q70,154 66,156 L58,156 Q54,154 54,148 Z" fill={`url(#bodyGrad-${side})`} stroke="hsl(220, 15%, 28%)" strokeWidth="0.4" />

        {/* Muscle regions with status-based coloring */}
        {muscles.map((m) => {
          const style = getRegionStyle(m.id);
          const paths = [m.d];
          // Mirror for bilateral muscles
          if (m.mirror) {
            // Render original + mirrored
            return (
              <g key={m.id} filter={style.opacity > 0.3 ? `url(#glow-${side})` : undefined}>
                <path d={m.d} fill={style.fill} opacity={style.opacity} rx="2" />
                <path d={m.d} fill={style.fill} opacity={style.opacity} transform="translate(100, 0) scale(-1, 1)" />
              </g>
            );
          }
          return (
            <path key={m.id} d={m.d} fill={style.fill} opacity={style.opacity} filter={style.opacity > 0.3 ? `url(#glow-${side})` : undefined} />
          );
        })}

        {/* Subtle body outline glow */}
        <ellipse cx="50" cy="14" rx="10" ry="12" fill="none" stroke="hsl(220, 15%, 30%)" strokeWidth="0.3" />
      </svg>
      <span className="text-[11px] font-medium text-muted-foreground mt-2">
        {side === "front" ? "Frontal" : "Posterior"}
      </span>
    </div>
  );
}

function RecoverySummary({ regions }: { regions: MuscleRegion[] }) {
  const fatigued = regions.filter(r => r.status === "fatigued").map(r => r.name.toLowerCase());
  const recovering = regions.filter(r => r.status === "recovering").map(r => r.name.toLowerCase());
  const activated = regions.filter(r => r.status === "activated").map(r => r.name.toLowerCase());
  const neutral = regions.filter(r => r.status === "neutral").map(r => r.name.toLowerCase());

  const insights: string[] = [];
  if (activated.length) insights.push(`Maior estímulo em ${activated.join(" e ")} nesta semana`);
  if (fatigued.length) insights.push(`${fatigued.join(" e ")} com fadiga elevada — evite sobrecarregar`);
  if (recovering.length) insights.push(`${recovering.join(", ")} ainda em recuperação`);
  if (neutral.length > 2) insights.push(`Baixo estímulo em membros como ${neutral.slice(0, 2).join(" e ")}`);

  return (
    <div className="space-y-2">
      {insights.slice(0, 3).map((insight, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">{insight}</p>
        </div>
      ))}
    </div>
  );
}

const evolutionPhotos = [
  { id: 'jan', month: 'Jan', year: '2026', label: 'Janeiro 2026', hasPhoto: true },
  { id: 'fev', month: 'Fev', year: '2026', label: 'Fevereiro 2026', hasPhoto: true },
  { id: 'mar', month: 'Mar', year: '2026', label: 'Março 2026', hasPhoto: true },
  { id: 'abr', month: 'Abr', year: '2026', label: 'Abril 2026', hasPhoto: true },
  { id: 'mai', month: 'Mai', year: '2026', label: 'Maio 2026', hasPhoto: true },
  { id: 'jun', month: 'Jun', year: '2026', label: 'Junho 2026', hasPhoto: false },
];

export default function Progress() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("7d");
  const [showCompare, setShowCompare] = useState(false);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [compareView, setCompareView] = useState(false);
  const state = getAdherenceState();
  const stats = periodStats[period];
  const maxW = Math.max(...weightHistory.map(w => w.weight));
  const minW = Math.min(...weightHistory.map(w => w.weight));
  const range = maxW - minW || 1;
  const maxVol = Math.max(...weeklyVolume.map(v => v.vol));

  useEffect(() => { tracker.track('home_viewed'); }, []);

  const anim = (delay: number) => ({ initial: { opacity: 0, y: 20 } as const, animate: { opacity: 1, y: 0 } as const, transition: { delay } });

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
              <ArrowLeft size={20} className="text-foreground" />
            </button>
            <h1 className="text-2xl font-display font-bold text-foreground">Atividades</h1>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card text-xs font-semibold text-primary">
            <Calendar size={14} /> Histórico
          </button>
        </div>

        {/* ═══ LAYER 1: Body Map / Recovery ═══ */}
        <motion.div {...anim(0.05)} className="bg-card rounded-2xl p-5 shadow-card mb-5 overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Activity size={14} className="text-primary" />
              </div>
              <h2 className="text-base font-display font-semibold text-foreground">Recuperação corporal</h2>
            </div>
            <button className="text-[11px] text-primary font-medium flex items-center gap-0.5">
              Ver mais <ChevronRight size={14} />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mb-5 ml-9">Leitura do seu corpo nos últimos dias</p>

          {/* Body map */}
          <div className="grid grid-cols-2 gap-6 mb-5 px-2">
            <PremiumBodyMap side="front" regions={muscleRegions} />
            <PremiumBodyMap side="back" regions={muscleRegions} />
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-5 px-1">
            {(Object.entries(statusConfig) as [MuscleStatus, typeof statusConfig[MuscleStatus]][]).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} style={{ boxShadow: `0 0 6px ${cfg.color}40` }} />
                <span className="text-[11px] text-muted-foreground">{cfg.label}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-border/50 mb-4" />

          {/* Smart summary */}
          <RecoverySummary regions={muscleRegions} />
        </motion.div>

        {/* ═══ LAYER 2: Period Stats ═══ */}
        <motion.div {...anim(0.15)}>
          {/* Period selector */}
          <div className="flex items-center gap-2 mb-4">
            {(["7d", "14d", "28d"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                  period === p ? "gradient-orange text-primary-foreground" : "bg-card text-muted-foreground"
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>

          {/* Summary phrase */}
          <p className="text-sm text-foreground mb-4">
            Você realizou <span className="text-primary font-semibold">{stats.workouts} treinos</span> nos últimos {periodLabels[period]}
          </p>

          {/* Main stat cards */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-card rounded-xl p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Timer size={16} className="text-primary" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Tempo de treino</p>
              <p className="text-xl font-display font-bold text-foreground">{stats.time}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Flame size={16} className="text-amber-400" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Calorias</p>
              <p className="text-xl font-display font-bold text-foreground">{stats.calories.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">kcal</span></p>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Dumbbell size={16} className="text-emerald-400" />
              </div>
              <p className="text-[11px] text-muted-foreground">Exercícios</p>
              <p className="text-lg font-display font-bold text-foreground ml-auto">{stats.exercises}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Séries", value: stats.sets },
                { label: "Repetições", value: stats.reps.toLocaleString() },
                { label: "Carga", value: stats.load },
              ].map((m) => (
                <div key={m.label} className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5">{m.label}</p>
                  <p className="text-sm font-bold text-foreground">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ═══ LAYER 3: Muscle Groups Detail ═══ */}
        <motion.div {...anim(0.25)} className="bg-card rounded-2xl p-5 shadow-card mb-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Regiões mais trabalhadas</h3>
          <p className="text-[11px] text-muted-foreground mb-4">Últimos {periodLabels[period]}</p>
          <div className="space-y-3">
            {muscleGroups.sort((a, b) => b.pct - a.pct).slice(0, 5).map((mg) => {
              const sc = statusColors[mg.status];
              return (
                <div key={mg.name} className="flex items-center gap-3">
                  <span className="text-xs text-foreground w-20 shrink-0">{mg.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full gradient-orange"
                      initial={{ width: 0 }}
                      animate={{ width: `${mg.pct}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-10 text-right">{mg.pct}%</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text} font-medium w-[72px] text-center shrink-0`}>{sc.label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ═══ LAYER 4: Exercise Types ═══ */}
        <motion.div {...anim(0.35)} className="bg-card rounded-2xl p-5 shadow-card mb-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Tipos de exercícios</h3>
          <p className="text-[11px] text-muted-foreground mb-4">Últimos {periodLabels[period]}</p>
          <div className="flex h-3 rounded-full overflow-hidden mb-4">
            {exerciseTypes.map((t) => (
              <motion.div
                key={t.name}
                className={`h-full ${t.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${t.pct}%` }}
                transition={{ duration: 0.8 }}
              />
            ))}
          </div>
          <div className="flex items-center gap-4">
            {exerciseTypes.map((t) => (
              <div key={t.name} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                <span className="text-[11px] text-muted-foreground">{t.name}</span>
                <span className="text-[11px] font-semibold text-foreground">{t.pct}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ═══ LAYER 5: Volume Evolution ═══ */}
        {/* ═══ LAYER 4.5: Complementary Activities ═══ */}
        <motion.div {...anim(0.37)} className="bg-card rounded-2xl p-5 shadow-card mb-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Zap size={14} className="text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Atividades complementares</h3>
            </div>
            <button
              onClick={() => navigate("/log-activity")}
              className="w-7 h-7 rounded-full gradient-orange flex items-center justify-center shadow-orange"
            >
              <Plus size={14} className="text-primary-foreground" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4 ml-9">Outras modalidades registradas na semana</p>

          {recentActivities.length > 0 ? (
            <div className="space-y-2.5">
              {recentActivities.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                  <span className="text-lg">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground">{a.modality}</p>
                      {a.source === "device" && <Watch size={10} className="text-muted-foreground" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{a.duration} min · {a.calories} kcal</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{a.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={() => navigate("/log-activity")}
              className="w-full p-4 rounded-xl border border-dashed border-border flex flex-col items-center gap-2"
            >
              <Plus size={18} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Registrar atividade</p>
            </button>
          )}

          {/* Weekly summary */}
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground">Tempo extra</p>
                <p className="text-sm font-bold text-foreground">2h 20min</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Calorias</p>
                <p className="text-sm font-bold text-foreground">1.330 kcal</p>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10">
              <span className="text-[10px] font-semibold text-primary">+bônus ranking</span>
            </div>
          </div>
        </motion.div>

        <motion.div {...anim(0.4)} className="bg-card rounded-2xl p-5 shadow-card mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Volume semanal</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Carga total por semana</p>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10">
              <TrendingUp size={12} className="text-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400">+12%</span>
            </div>
          </div>
          <div className="flex items-end gap-3 h-28">
            {weeklyVolume.map((w, i) => {
              const h = (w.vol / maxVol) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium">{(w.vol / 1000).toFixed(1)}t</span>
                  <motion.div
                    className="w-full rounded-t-lg gradient-orange"
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                  />
                  <span className="text-[10px] text-muted-foreground">{w.week}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ═══ LAYER 6: Weight Evolution ═══ */}
        <motion.div {...anim(0.45)} className="bg-card rounded-2xl p-5 shadow-card mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Evolução do peso</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{patient.startWeight}kg → {patient.currentWeight}kg</p>
            </div>
            <div className="flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              <TrendingDown size={14} className="text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">-{(patient.startWeight - patient.currentWeight).toFixed(1)}kg</span>
            </div>
          </div>
          <div className="flex items-end gap-2 h-28">
            {weightHistory.map((w, i) => {
              const h = ((maxW - w.weight) / range) * 80 + 20;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{w.weight}</span>
                  <motion.div
                    className="w-full rounded-t-lg gradient-orange"
                    initial={{ height: 0 }}
                    animate={{ height: `${100 - h + 20}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                  />
                  <span className="text-[10px] text-muted-foreground">{w.date}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ═══ LAYER 7: Consistency + Insights ═══ */}
        <motion.div {...anim(0.5)} className="bg-card rounded-2xl p-5 shadow-card mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Constância mensal</h3>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 28 }, (_, i) => {
              const active = i < 18;
              const intensity = active ? Math.random() > 0.3 ? "gradient-orange" : "bg-primary/40" : "bg-muted";
              return <div key={i} className={`aspect-square rounded-md ${intensity}`} />;
            })}
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">18 de 28 dias ativos</span>
            <span className="text-xs font-semibold text-primary">64%</span>
          </div>
        </motion.div>

        {/* ═══ LAYER 8: VRI + Achievements ═══ */}
        <motion.div {...anim(0.55)} className="bg-card rounded-2xl p-4 shadow-card mb-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl gradient-orange flex items-center justify-center shadow-orange shrink-0">
            <span className="text-xl font-display font-bold text-primary-foreground">{state.score}%</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Índice VRI</p>
            <p className="text-xs text-muted-foreground">Sequência de {state.streak} dias • {state.weeklyCompletionRate}% semanal</p>
          </div>
          <Activity size={18} className="text-primary shrink-0" />
        </motion.div>

        {/* Photo Album */}
        <motion.div {...anim(0.6)} className="bg-card rounded-2xl p-5 shadow-card mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Fotos evolutivas</h3>
            <button
              onClick={() => { setShowCompare(true); setCompareA(null); setCompareB(null); setCompareView(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary"
            >
              <Layers size={12} /> Comparar
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {evolutionPhotos.map((p) => (
              <div key={p.id} className="aspect-[3/4] rounded-xl bg-muted flex flex-col items-center justify-center gap-1 relative overflow-hidden">
                {p.hasPhoto ? (
                  <div className="absolute inset-0 bg-gradient-to-b from-secondary/80 to-muted flex flex-col items-center justify-center gap-1">
                    <Camera size={18} className="text-muted-foreground/50" />
                    <span className="text-[10px] text-muted-foreground">{p.month}</span>
                  </div>
                ) : (
                  <>
                    <Image size={20} className="text-muted-foreground/30" />
                    <span className="text-[10px] text-muted-foreground/40">{p.month}</span>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 text-center">Toque em "Comparar" para ver seu antes e depois</p>
        </motion.div>

        {/* Achievements */}
        <motion.div {...anim(0.65)}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Conquistas recentes</h3>
            <button onClick={() => navigate("/achievements")} className="text-xs text-primary font-medium">Ver todas</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 mb-5">
            {achievements.filter(a => a.unlocked).slice(-4).map((a) => (
              <div key={a.id} className="min-w-[120px] bg-card rounded-xl p-3 flex flex-col items-center gap-2 shadow-card">
                <span className="text-2xl">{a.icon}</span>
                <span className="text-[11px] font-medium text-foreground text-center leading-tight">{a.title}</span>
                <span className="text-[9px] text-muted-foreground">{a.date}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      <BottomNav />

      {/* ── Compare Evolution Modal ── */}
      <AnimatePresence>
        {showCompare && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCompare(false)}
              className="fixed inset-0 z-50 bg-black/70"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-w-[430px] mx-auto max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-card px-5 pt-4 pb-3 z-10">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto mb-4" />
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">
                    {compareView ? 'Sua evolução' : 'Comparar evolução'}
                  </h3>
                  <button onClick={() => setShowCompare(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <X size={16} className="text-foreground" />
                  </button>
                </div>
              </div>

              <div className="px-5 pb-8">
                <AnimatePresence mode="wait">
                  {!compareView ? (
                    <motion.div key="selector" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {/* Suggested comparisons */}
                      <div className="mb-5">
                        <p className="text-xs text-muted-foreground mb-3">Comparações sugeridas</p>
                        <div className="flex flex-col gap-2">
                          {[
                            { a: 'jan', b: 'mai', label: 'Início vs Atual', desc: 'Jan 2026 → Mai 2026 · 4 meses' },
                            { a: 'abr', b: 'mai', label: 'Último mês', desc: 'Abr 2026 → Mai 2026 · 1 mês' },
                            { a: 'jan', b: 'mar', label: 'Primeiro trimestre', desc: 'Jan 2026 → Mar 2026 · 3 meses' },
                          ].map((s, i) => (
                            <button
                              key={i}
                              onClick={() => { setCompareA(s.a); setCompareB(s.b); setCompareView(true); }}
                              className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-colors text-left"
                            >
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Layers size={18} className="text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">{s.label}</p>
                                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                              </div>
                              <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Manual selection */}
                      <div className="mb-5">
                        <p className="text-xs text-muted-foreground mb-3">Ou escolha manualmente</p>

                        <div className="mb-3">
                          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2">Foto A — Antes</p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {evolutionPhotos.filter(p => p.hasPhoto).map((p) => (
                              <button
                                key={p.id}
                                onClick={() => setCompareA(p.id)}
                                className={`min-w-[64px] aspect-[3/4] rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-all shrink-0 ${
                                  compareA === p.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border bg-muted/50'
                                }`}
                              >
                                <Camera size={14} className={compareA === p.id ? 'text-primary' : 'text-muted-foreground/50'} />
                                <span className={`text-[10px] font-medium ${compareA === p.id ? 'text-primary' : 'text-muted-foreground'}`}>{p.month}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2">Foto B — Depois</p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {evolutionPhotos.filter(p => p.hasPhoto && p.id !== compareA).map((p) => (
                              <button
                                key={p.id}
                                onClick={() => setCompareB(p.id)}
                                className={`min-w-[64px] aspect-[3/4] rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-all shrink-0 ${
                                  compareB === p.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border bg-muted/50'
                                }`}
                              >
                                <Camera size={14} className={compareB === p.id ? 'text-primary' : 'text-muted-foreground/50'} />
                                <span className={`text-[10px] font-medium ${compareB === p.id ? 'text-primary' : 'text-muted-foreground'}`}>{p.month}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => { if (compareA && compareB) setCompareView(true); }}
                          disabled={!compareA || !compareB}
                          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
                        >
                          <Layers size={16} /> Comparar fotos
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="result" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
                      {/* Comparison result */}
                      {(() => {
                        const photoA = evolutionPhotos.find(p => p.id === compareA);
                        const photoB = evolutionPhotos.find(p => p.id === compareB);
                        if (!photoA || !photoB) return null;

                        return (
                          <>
                            {/* Hero message */}
                            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/10 mb-5">
                              <p className="text-sm font-semibold text-foreground mb-1">Veja o quanto você evoluiu</p>
                              <p className="text-[11px] text-muted-foreground">Sua constância aparece aqui. Compare sua transformação ao longo do tempo.</p>
                            </div>

                            {/* Side by side */}
                            <div className="flex items-stretch gap-3 mb-4">
                              <div className="flex-1">
                                <div className="aspect-[3/4] rounded-2xl bg-gradient-to-b from-secondary to-muted border border-border flex flex-col items-center justify-center gap-2 relative overflow-hidden">
                                  <Camera size={28} className="text-muted-foreground/30" />
                                  <p className="text-xs text-muted-foreground/50">Foto</p>
                                  <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-background/70 backdrop-blur-sm">
                                    <span className="text-[9px] font-bold text-muted-foreground">ANTES</span>
                                  </div>
                                </div>
                                <p className="text-xs font-semibold text-foreground text-center mt-2">{photoA.label}</p>
                              </div>

                              <div className="flex items-center">
                                <ArrowRight size={16} className="text-primary/50" />
                              </div>

                              <div className="flex-1">
                                <div className="aspect-[3/4] rounded-2xl bg-gradient-to-b from-primary/10 to-secondary border border-primary/15 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
                                  <Camera size={28} className="text-primary/30" />
                                  <p className="text-xs text-primary/40">Foto</p>
                                  <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-primary/20 backdrop-blur-sm">
                                    <span className="text-[9px] font-bold text-primary">ATUAL</span>
                                  </div>
                                </div>
                                <p className="text-xs font-semibold text-foreground text-center mt-2">{photoB.label}</p>
                              </div>
                            </div>

                            {/* Time delta */}
                            <div className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-muted/50 border border-border mb-5">
                              <Calendar size={14} className="text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{photoA.month} {photoA.year}</span>
                              <ArrowRight size={12} className="text-primary/50" />
                              <span className="text-xs text-muted-foreground">{photoB.month} {photoB.year}</span>
                              <span className="text-[10px] font-semibold text-primary ml-auto">
                                {Math.abs(evolutionPhotos.findIndex(p => p.id === compareB) - evolutionPhotos.findIndex(p => p.id === compareA))} meses
                              </span>
                            </div>

                            {/* Stats summary */}
                            <div className="grid grid-cols-3 gap-2 mb-5">
                              <div className="p-3 rounded-xl bg-card border border-border text-center">
                                <p className="text-sm font-bold text-primary">-2.4</p>
                                <p className="text-[9px] text-muted-foreground">kg perdidos</p>
                              </div>
                              <div className="p-3 rounded-xl bg-card border border-border text-center">
                                <p className="text-sm font-bold text-foreground">92%</p>
                                <p className="text-[9px] text-muted-foreground">adesão média</p>
                              </div>
                              <div className="p-3 rounded-xl bg-card border border-border text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Flame size={12} className="text-primary" />
                                  <p className="text-sm font-bold text-foreground">64</p>
                                </div>
                                <p className="text-[9px] text-muted-foreground">treinos feitos</p>
                              </div>
                            </div>

                            {/* Motivational */}
                            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 mb-5">
                              <div className="flex items-start gap-2.5">
                                <Zap size={14} className="text-primary mt-0.5 shrink-0" />
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                  <span className="text-foreground font-medium">Sua evolução fica mais clara quando você olha o processo.</span> Continue registrando para acompanhar cada passo.
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2.5">
                              <button
                                onClick={() => navigate('/share?type=evolution')}
                                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
                              >
                                Compartilhar evolução
                              </button>
                              <button
                                onClick={() => setCompareView(false)}
                                className="w-full py-3 rounded-xl bg-muted text-foreground font-medium text-sm"
                              >
                                Comparar outros períodos
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
