import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calendar, Image, TrendingDown, TrendingUp, Zap, Activity, X, ArrowRight, Plus, Watch, Trophy, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { comparablePoses, dayLabel, groupByPose, POSE_LABEL, poseKey, type PoseKey } from "@/lib/photoPose";
import {
  getActivitySessionsSince,
  getActivityEventsSince,
  getRecentWeightLogs,
  getLatestAdherenceState,
  getMyProgressPhotos,
} from "@/lib/api";
import { modalityBySlug } from "@/lib/activityModalities";
import { daysAgoLocal, localDateKey } from "@/lib/pendingLogic";
import { deriveConstancy, countWorkoutDaysInWindow } from "@/lib/constancy";
import { tracker } from "@/lib/eventTracker";
import { useAchievements } from "@/hooks/useAchievements";
import WeeklyKcalCard from "@/components/WeeklyKcalCard";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import { photoCaption, weightNear } from "@/lib/photoWeight";
import BottomNav from "@/components/BottomNav";
import DynamicBodyMap from "@/components/DynamicBodyMap";

type Period = "7d" | "14d" | "28d";
const periodLabels: Record<Period, string> = { "7d": "7 dias", "14d": "14 dias", "28d": "28 dias" };
const periodDays: Record<Period, number> = { "7d": 7, "14d": 14, "28d": 28 };

// Rótulo de data relativa p/ a lista de atividades complementares reais (fuso local; reusa daysAgoLocal).
function activityDateLabel(iso: string, now: Date): string {
  const days = daysAgoLocal(iso, now);
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days <= 6) {
    const wd = new Date(iso).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    return wd.charAt(0).toUpperCase() + wd.slice(1);
  }
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatExtraTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// Rótulo curto "Mês/AA" de uma foto (pt-BR), capitalizado.
function photoLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const mon = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${mon.charAt(0).toUpperCase()}${mon.slice(1)}/${String(d.getFullYear()).slice(2)}`;
}

// Rótulo "dd/mm" p/ o eixo do gráfico de peso.
function dayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function Progress() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("7d");
  const [showCompare, setShowCompare] = useState(false);
  const [cmpPose, setCmpPose] = useState<PoseKey | null>(null);
  const [cmpBeforeId, setCmpBeforeId] = useState<string | null>(null);
  const [cmpAfterId, setCmpAfterId] = useState<string | null>(null);
  const now = new Date();
  const windowDays = periodDays[period];
  // Conquistas recentes (S5): destravadas mais recentes, via motor (patient_achievements). Só leitura.
  const { recent: recentAchievements, isLoading: achievementsLoading } = useAchievements();

  useEffect(() => { tracker.track('home_viewed'); }, []);

  // ── Atividades complementares REAIS (activity_sessions) da SEMANA (S2 — bloco C, inalterado) ──
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const {
    data: weekActivitySessions = [],
    isLoading: activitiesLoading,
    isError: activitiesError,
    refetch: refetchActivities,
  } = useQuery({
    queryKey: ["activity-sessions", "week", localDateKey(now)],
    queryFn: () => getActivitySessionsSince(weekStart),
  });
  const recentActivities = weekActivitySessions.slice(0, 5);
  const weekActivityMinutes = weekActivitySessions.reduce((sum, a) => sum + (a.duration_min ?? 0), 0);
  const weekActivityCalories = weekActivitySessions.reduce((sum, a) => sum + (a.calories ?? 0), 0);
  const hasActivities = weekActivitySessions.length > 0;

  // ── activity_events dos últimos 28 dias -> constância (determinística) + nº de treinos (escopo do seletor) ──
  const events28Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 27);
  const {
    data: events28 = [],
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ["progress-events", localDateKey(now)],
    queryFn: () => getActivityEventsSince(events28Start),
  });
  const constancy = deriveConstancy(events28, now, windowDays);
  const workoutsInPeriod = countWorkoutDaysInWindow(events28, now, windowDays);

  // ── Peso REAL (weight_logs). Série cronológica; delta = último - primeiro. NÃO escopado pelo seletor
  //    de propósito: a pesagem é ~semanal (7d daria 1 ponto). Mostra a série completa recente. ──
  const {
    data: weightRows = [],
    isLoading: weightLoading,
    isError: weightError,
    refetch: refetchWeight,
  } = useQuery({ queryKey: ["weight-series"], queryFn: () => getRecentWeightLogs(60) });
  const weightSeries = [...weightRows].reverse(); // getRecentWeightLogs vem desc -> asc (antigo->recente)
  const hasWeight = weightSeries.length >= 2;
  const startWeight = weightSeries[0]?.weight_kg ?? null;
  const currentWeight = weightSeries[weightSeries.length - 1]?.weight_kg ?? null;
  const weightDelta = startWeight != null && currentWeight != null ? currentWeight - startWeight : null;
  const maxW = hasWeight ? Math.max(...weightSeries.map((w) => w.weight_kg)) : 0;
  const minW = hasWeight ? Math.min(...weightSeries.map((w) => w.weight_kg)) : 0;
  const rangeW = maxW - minW || 1;

  // ── VRI: LÊ o último snapshot real (mesma fonte/queryKey da Home). NÃO recalcula nem grava. ──
  const adherenceQuery = useQuery({ queryKey: ["adherence"], queryFn: getLatestAdherenceState });
  const vri = adherenceQuery.data ?? null; // getLatestAdherenceState: só LÊ o snapshot (não recomputa/grava)

  // ── Fotos de evolução REAIS (progress_photos). ──
  const {
    data: photos = [],
    isLoading: photosLoading,
    isError: photosError,
  } = useQuery({
    queryKey: ["progress-photos"],
    queryFn: getMyProgressPhotos,
    // display_url é signed URL com TTL de 10 min. Mantém o cache abaixo disso para nunca
    // reutilizar uma URL assinada expirada (WP-STORAGE P2).
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
  // Comparação SEMPRE entre fotos da mesma posição (frente × frente...). Padrão: a mais antiga × a mais recente.
  const comparable = comparablePoses(photos);
  const canCompare = comparable.length > 0;
  const photoGroups = groupByPose(photos);
  const cmpKey: PoseKey = cmpPose && comparable.includes(cmpPose) ? cmpPose : (comparable[0] ?? "none");
  const cmpList = photoGroups[cmpKey];
  const firstPhoto = cmpList.find((p) => p.id === cmpBeforeId) ?? cmpList[0] ?? null;
  const lastPhoto = cmpList.find((p) => p.id === cmpAfterId) ?? cmpList[cmpList.length - 1] ?? null;

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
        </div>

        {/* ═══ LAYER 1: Body Map / Recovery (REAL, inalterado) ═══ */}
        <motion.div {...anim(0.05)} className="bg-card rounded-2xl p-5 shadow-card mb-5 overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Activity size={14} className="text-primary" />
              </div>
              <h2 className="text-base font-display font-semibold text-foreground">Recuperação corporal</h2>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mb-5 ml-9">Leitura do seu corpo nos últimos dias</p>
          <DynamicBodyMap />
        </motion.div>

        {/* ═══ LAYER 2: Period selector + nº de treinos REAL (escopo do seletor) ═══ */}
        {/* NOTA (S4): cards de desempenho de treino (tempo, calorias, exercícios, séries, reps, carga),
            "Regiões mais trabalhadas", "Tipos de exercícios" e "Volume semanal" foram REMOVIDOS: exigem
            dados de EXECUÇÃO (séries/reps/carga/duração feitas, com link workout_checked->workout) que o
            app NÃO captura hoje. Reaparecem quando existir essa captura -> dívida S-EXEC (ver contrato). */}
        <motion.div {...anim(0.15)}>
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
          <p className="text-sm text-foreground mb-5">
            Você realizou{" "}
            <span className="text-primary font-semibold">
              {eventsError ? "—" : eventsLoading ? "…" : `${workoutsInPeriod} treino${workoutsInPeriod === 1 ? "" : "s"}`}
            </span>{" "}
            nos últimos {periodLabels[period]}
          </p>
        </motion.div>

        {/* ═══ LAYER 4.5: Complementary Activities (activity_sessions REAIS, S2 — inalterado) ═══ */}
        <motion.div {...anim(0.2)} className="bg-card rounded-2xl p-5 shadow-card mb-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Zap size={14} className="text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Atividades complementares</h3>
            </div>
            <button
              onClick={() => navigate("/log-activity")}
              aria-label="Registrar atividade complementar"
              className="w-7 h-7 rounded-full gradient-orange flex items-center justify-center shadow-orange"
            >
              <Plus size={14} className="text-primary-foreground" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4 ml-9">Outras modalidades registradas na semana</p>

          {activitiesLoading ? (
            <div className="space-y-2.5">
              {[0, 1].map((i) => (
                <div key={i} className="h-[52px] rounded-xl bg-muted/40 border border-border/50 animate-pulse" />
              ))}
            </div>
          ) : activitiesError ? (
            <div className="w-full p-4 rounded-xl border border-dashed border-red-500/30 flex flex-col items-center gap-2 text-center">
              <p className="text-xs text-red-400">Não foi possível carregar suas atividades.</p>
              <button onClick={() => refetchActivities()} className="text-[11px] font-semibold text-primary">
                Tentar novamente
              </button>
            </div>
          ) : hasActivities ? (
            <>
              <div className="space-y-2.5">
                {recentActivities.map((a) => {
                  const meta = modalityBySlug(a.modality);
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                      <span className="text-lg">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-foreground">{meta.label}</p>
                          {a.source === "device" && <Watch size={10} className="text-muted-foreground" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {a.duration_min} min{a.calories != null ? ` · ${a.calories} kcal` : ""}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{activityDateLabel(a.performed_at, now)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Tempo extra</p>
                    <p className="text-sm font-bold text-foreground">{formatExtraTime(weekActivityMinutes)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Calorias</p>
                    <p className="text-sm font-bold text-foreground">{weekActivityCalories.toLocaleString("pt-BR")} kcal</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10">
                  <span className="text-[10px] font-semibold text-primary">+bônus ranking</span>
                </div>
              </div>
            </>
          ) : (
            <button
              onClick={() => navigate("/log-activity")}
              className="w-full p-4 rounded-xl border border-dashed border-border flex flex-col items-center gap-2"
            >
              <Plus size={18} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Nenhuma atividade complementar ainda</p>
              <p className="text-[10px] text-muted-foreground">Toque para registrar</p>
            </button>
          )}
        </motion.div>

        {/* ═══ Weight Evolution (REAL — weight_logs) ═══ */}
        <motion.div {...anim(0.3)} className="bg-card rounded-2xl p-5 shadow-card mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Evolução do peso</h3>
              {hasWeight && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{startWeight}kg → {currentWeight}kg</p>
              )}
            </div>
            {hasWeight && weightDelta != null && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${weightDelta <= 0 ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                {weightDelta <= 0 ? <TrendingDown size={14} className="text-emerald-400" /> : <TrendingUp size={14} className="text-amber-400" />}
                <span className={`text-xs font-semibold ${weightDelta <= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {weightDelta > 0 ? "+" : ""}{weightDelta.toFixed(1)}kg
                </span>
              </div>
            )}
          </div>
          {weightLoading ? (
            <div className="h-28 rounded-xl bg-muted/40 animate-pulse" />
          ) : weightError ? (
            <div className="p-4 rounded-xl border border-dashed border-red-500/30 flex flex-col items-center gap-2 text-center">
              <p className="text-xs text-red-400">Não foi possível carregar seu peso.</p>
              <button onClick={() => refetchWeight()} className="text-[11px] font-semibold text-primary">Tentar novamente</button>
            </div>
          ) : hasWeight ? (
            <div className="flex items-end gap-2 h-28 overflow-x-auto">
              {weightSeries.map((w, i) => {
                const norm = (w.weight_kg - minW) / rangeW; // 0..1
                const hpct = 30 + norm * 70; // barra maior = peso maior
                return (
                  <div key={w.id ?? i} className="flex-1 min-w-[26px] flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{w.weight_kg}</span>
                    <motion.div
                      className="w-full rounded-t-lg gradient-orange"
                      initial={{ height: 0 }}
                      animate={{ height: `${hpct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.06 }}
                    />
                    <span className="text-[9px] text-muted-foreground">{dayMonth(w.measured_at)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-border flex flex-col items-center gap-1 text-center">
              <p className="text-xs text-muted-foreground">Sem registros de peso suficientes ainda</p>
              <p className="text-[10px] text-muted-foreground">Registre seu peso para ver a evolução</p>
            </div>
          )}
        </motion.div>

        {/* ═══ Constância (REAL, DETERMINÍSTICA — activity_events; escopada pelo seletor) ═══ */}
        <motion.div {...anim(0.4)} className="bg-card rounded-2xl p-5 shadow-card mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Constância</h3>
            <span className="text-[11px] text-muted-foreground ml-auto">Últimos {periodLabels[period]}</span>
          </div>
          {eventsLoading ? (
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: windowDays }, (_, i) => (
                <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : eventsError ? (
            <div className="p-4 rounded-xl border border-dashed border-red-500/30 flex flex-col items-center gap-2 text-center">
              <p className="text-xs text-red-400">Não foi possível carregar sua constância.</p>
              <button onClick={() => refetchEvents()} className="text-[11px] font-semibold text-primary">Tentar novamente</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1.5">
                {constancy.days.map((d) => (
                  <div
                    key={d.dateKey}
                    title={d.dateKey}
                    className={`aspect-square rounded-md ${d.active ? "gradient-orange" : "bg-muted"}`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">{constancy.activeCount} de {constancy.windowDays} dias ativos</span>
                <span className="text-xs font-semibold text-primary">{constancy.rate}%</span>
              </div>
            </>
          )}
        </motion.div>

        <WeeklyKcalCard />

        {/* ═══ VRI (REAL — último snapshot de adherence_snapshots) ═══ */}
        <motion.div {...anim(0.5)} onClick={() => vri && navigate("/vri")} role={vri ? "button" : undefined} aria-label={vri ? "Ver detalhes do índice VRI" : undefined} className={`bg-card rounded-2xl p-4 shadow-card mb-5 flex items-center gap-4 ${vri ? "cursor-pointer" : ""}`}>
          {adherenceQuery.isLoading ? (
            <div className="flex items-center gap-4 w-full">
              <div className="w-14 h-14 rounded-2xl bg-muted animate-pulse shrink-0" />
              <div className="flex-1 h-8 rounded bg-muted animate-pulse" />
            </div>
          ) : adherenceQuery.isError ? (
            <div className="flex items-center gap-4 w-full">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                <Activity size={18} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Índice VRI</p>
                <p className="text-xs text-red-400">
                  Não foi possível carregar.{" "}
                  <button onClick={() => adherenceQuery.refetch()} className="font-semibold text-primary underline">
                    Tentar novamente
                  </button>
                </p>
              </div>
            </div>
          ) : vri ? (
            <>
              <div className="w-14 h-14 rounded-2xl gradient-orange flex items-center justify-center shadow-orange shrink-0">
                <span className="text-xl font-display font-bold text-primary-foreground">{vri.score}%</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Índice VRI</p>
                <p className="text-xs text-muted-foreground">Sequência de {vri.streak} dias • {vri.weeklyCompletionRate}% semanal</p>
              </div>
              <span className="text-xs font-semibold text-primary shrink-0 flex items-center">Detalhes <ChevronRight size={14} /></span>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                <Activity size={18} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Índice VRI</p>
                <p className="text-xs text-muted-foreground">Ainda não disponível — registre seus hábitos para calcular.</p>
              </div>
            </>
          )}
        </motion.div>

        {/* ═══ Fotos evolutivas (REAIS — progress_photos) ═══ */}
        <motion.div {...anim(0.6)} className="bg-card rounded-2xl p-5 shadow-card mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Fotos evolutivas</h3>
            <button
              onClick={() => canCompare && setShowCompare(true)}
              disabled={!canCompare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary disabled:opacity-40 disabled:pointer-events-none"
            >
              <ArrowRight size={12} /> Comparar
            </button>
          </div>
          {photosLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : photosError ? (
            <p className="text-xs text-red-400 text-center py-4">Não foi possível carregar suas fotos.</p>
          ) : photos.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p) => (
                  <div key={p.id} className="aspect-[3/4] rounded-xl bg-muted overflow-hidden relative">
                    {p.display_url ? (
                      <img src={p.display_url} alt={`Foto ${photoLabel(p.taken_at)}`} className="absolute inset-0 w-full h-full object-contain" loading="lazy" />
                    ) : null}
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-background/70 backdrop-blur-sm text-[9px] text-foreground">{photoLabel(p.taken_at)}</span>
                    {poseKey(p) !== "none" && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-background/70 backdrop-blur-sm text-[9px] font-semibold text-primary">{POSE_LABEL[poseKey(p)]}</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 text-center">
                {canCompare ? 'Toque em "Comparar" para ver antes e depois' : "Envie mais fotos na mesma posição (ex.: duas de frente) para comparar"}
              </p>
            </>
          ) : (
            <div className="p-5 rounded-xl border border-dashed border-border flex flex-col items-center gap-2 text-center">
              <Image size={20} className="text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">Nenhuma foto de evolução ainda</p>
              <p className="text-[10px] text-muted-foreground">Registre fotos em "Registros" para acompanhar</p>
            </div>
          )}
        </motion.div>

        {/* ═══ Conquistas recentes — REAL (motor S5: patient_achievements via achievementsEngine) ═══ */}
        <motion.div {...anim(0.65)}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Conquistas recentes</h3>
            <button onClick={() => navigate("/achievements")} className="text-xs text-primary font-medium flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </button>
          </div>
          {achievementsLoading ? (
            <div className="flex flex-col gap-2 mb-5">
              {[0, 1].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : recentAchievements.length > 0 ? (
            <div className="flex flex-col gap-2 mb-5">
              {recentAchievements.map((a) => (
                <button
                  key={a.code}
                  onClick={() => navigate("/achievements")}
                  className="bg-card rounded-xl p-3 flex items-center gap-3 shadow-card active:scale-[0.98] transition-transform text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xl">{a.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground">{a.unlockedAt ? activityDateLabel(a.unlockedAt, now) : ""}</p>
                  </div>
                  <Trophy size={16} className="text-warning shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-5 rounded-xl border border-dashed border-border flex flex-col items-center gap-2 text-center mb-5">
              <Trophy size={20} className="text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">Suas conquistas aparecerão aqui</p>
              <p className="text-[10px] text-muted-foreground">Complete ações no app para desbloquear</p>
            </div>
          )}
        </motion.div>
      </div>
      <BottomNav />

      {/* ── Compare Evolution Modal (REAL: fotos reais + Δpeso real de weight_logs) ── */}
      <AnimatePresence>
        {showCompare && firstPhoto && lastPhoto && (
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
                  <h3 className="text-base font-bold text-foreground">Sua evolução</h3>
                  <button onClick={() => setShowCompare(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <X size={16} className="text-foreground" />
                  </button>
                </div>
              </div>

              <div className="px-5 pb-8">
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/10 mb-5">
                  <p className="text-sm font-semibold text-foreground mb-1">Veja o quanto você evoluiu</p>
                  <p className="text-[11px] text-muted-foreground">Compare fotos da mesma posição. Por padrão, a primeira e a mais recente.</p>
                </div>

                {comparable.length > 1 && (
                  <div className="flex gap-2 mb-4" role="tablist" aria-label="Posição">
                    {comparable.map((k) => (
                      <button
                        key={k}
                        role="tab"
                        aria-selected={k === cmpKey}
                        onClick={() => { setCmpPose(k); setCmpBeforeId(null); setCmpAfterId(null); }}
                        className={`flex-1 h-9 rounded-xl border text-xs font-semibold ${k === cmpKey ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}
                      >
                        {POSE_LABEL[k]}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Antes
                    <select
                      value={firstPhoto.id}
                      onChange={(e) => setCmpBeforeId(e.target.value)}
                      className="mt-1 w-full h-9 rounded-lg bg-muted border border-border px-2 text-xs text-foreground"
                    >
                      {cmpList.map((p) => <option key={p.id} value={p.id}>{dayLabel(p.taken_at)}</option>)}
                    </select>
                  </label>
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Depois
                    <select
                      value={lastPhoto.id}
                      onChange={(e) => setCmpAfterId(e.target.value)}
                      className="mt-1 w-full h-9 rounded-lg bg-muted border border-border px-2 text-xs text-foreground"
                    >
                      {cmpList.map((p) => <option key={p.id} value={p.id}>{dayLabel(p.taken_at)}</option>)}
                    </select>
                  </label>
                </div>

                <BeforeAfterSlider
                  before={{ url: firstPhoto.display_url, alt: "Foto ANTES", caption: photoCaption(dayLabel(firstPhoto.taken_at), weightNear(firstPhoto.taken_at ?? "", weightRows)) }}
                  after={{ url: lastPhoto.display_url, alt: "Foto ATUAL", caption: photoCaption(dayLabel(lastPhoto.taken_at), weightNear(lastPhoto.taken_at ?? "", weightRows)) }}
                />

                {/* Único número: Δpeso REAL de weight_logs (sem métricas fabricadas) */}
                {hasWeight && weightDelta != null && (
                  <div className="p-3 rounded-xl bg-card border border-border text-center mb-5">
                    <p className={`text-lg font-bold ${weightDelta <= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                      {weightDelta > 0 ? "+" : ""}{weightDelta.toFixed(1)} kg
                    </p>
                    <p className="text-[10px] text-muted-foreground">variação de peso no período registrado</p>
                  </div>
                )}

                <button
                  onClick={() => navigate('/share?type=evolution')}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
                >
                  Compartilhar evolução
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
