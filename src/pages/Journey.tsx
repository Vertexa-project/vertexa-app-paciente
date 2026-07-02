import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Circle, ChevronRight, Zap, Trophy, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useJourney } from "@/hooks/useJourney";
import { tracker } from "@/lib/eventTracker";
import BottomNav from "@/components/BottomNav";

const phaseLabels: Record<string, { label: string; description: string; icon: string }> = {
  inicio: { label: 'Início', description: 'Primeiros passos na sua jornada', icon: '🌱' },
  constancia_inicial: { label: 'Constância inicial', description: 'Criando hábitos sólidos', icon: '🔥' },
  acompanhamento_ativo: { label: 'Acompanhamento ativo', description: 'Em ritmo de evolução', icon: '📈' },
  revisao_progresso: { label: 'Revisão de progresso', description: 'Avaliando conquistas', icon: '📊' },
  manutencao: { label: 'Manutenção', description: 'Consolidando resultados', icon: '🏆' },
};

const phases = ['inicio', 'constancia_inicial', 'acompanhamento_ativo', 'revisao_progresso', 'manutencao'];

// "02 Abr" a partir de um ISO ou de uma DATE "YYYY-MM-DD" (esta última parseada como LOCAL p/ não
// escorregar de dia num fuso negativo — mesma disciplina do dayNumber).
function fmtDate(s: string | null): string {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
  const mon = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${String(d.getDate()).padStart(2, "0")} ${mon.charAt(0).toUpperCase()}${mon.slice(1)}`;
}

export default function Journey() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useJourney();

  useEffect(() => { tracker.track('journey_viewed'); }, []);

  const phaseKey = data?.phase ?? 'inicio';
  const phaseInfo = phaseLabels[phaseKey] ?? phaseLabels.inicio;
  const currentPhaseIdx = phases.indexOf(phaseKey);
  const checkpoints = data?.checkpoints ?? [];
  const nextStep = checkpoints.find((c) => !c.completed);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Minha Jornada</h1>
          {data && data.dayNumber > 0 && (
            <span className="ml-auto text-xs text-primary font-semibold">Dia {data.dayNumber}</span>
          )}
        </div>

        {isError ? (
          <p className="text-xs text-red-400 text-center py-8">Não foi possível carregar sua jornada.</p>
        ) : isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="h-24 rounded-2xl bg-muted animate-pulse" />
            <div className="h-16 rounded-xl bg-muted animate-pulse" />
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Current Phase */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 shadow-card mb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl gradient-orange flex items-center justify-center shadow-orange">
                  <span className="text-2xl">{phaseInfo.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-primary font-semibold uppercase tracking-wider">Fase atual</p>
                  <p className="text-base font-display font-bold text-foreground">{phaseInfo.label}</p>
                  <p className="text-xs text-muted-foreground">{phaseInfo.description}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                {phases.map((p, i) => (
                  <div key={p} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`h-1.5 rounded-full w-full ${i <= currentPhaseIdx ? 'gradient-orange' : 'bg-muted'}`} />
                    <span className="text-[8px] text-muted-foreground">{phaseLabels[p].icon}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Stats row (REAL: streak/score do snapshot, marcos reais) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-card rounded-xl p-3 text-center">
                <Zap size={18} className="text-primary mx-auto mb-1" />
                <p className="text-lg font-display font-bold text-foreground">{data?.streak ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">dias seguidos</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center">
                <Trophy size={18} className="text-warning mx-auto mb-1" />
                <p className="text-lg font-display font-bold text-foreground">{data?.completedCount ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">marcos atingidos</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center">
                <Target size={18} className="text-success mx-auto mb-1" />
                <p className="text-lg font-display font-bold text-foreground">{data?.score != null ? `${data.score}%` : "—"}</p>
                <p className="text-[10px] text-muted-foreground">índice VRI</p>
              </div>
            </motion.div>

            {/* Timeline (REAL: onboarding + conquistas, cronológico; travados = marcos futuros) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="text-base font-display font-semibold text-foreground mb-4">Linha do tempo</h2>
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
                <div className="flex flex-col gap-1">
                  {checkpoints.map((cp, i) => (
                    <motion.div
                      key={cp.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.04 }}
                      className={`flex items-start gap-3 pl-1 py-2.5 ${!cp.completed ? 'opacity-50' : ''}`}
                    >
                      <div className="relative z-10 shrink-0">
                        {cp.completed ? (
                          <div className="w-9 h-9 rounded-full bg-success/20 flex items-center justify-center">
                            <CheckCircle2 size={20} className="text-success" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                            <Circle size={20} className="text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 bg-card rounded-xl p-3 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{cp.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{cp.title}</p>
                            <p className="text-[11px] text-muted-foreground">{cp.description}</p>
                          </div>
                          {cp.completed && cp.date && <span className="text-[10px] text-muted-foreground shrink-0">{fmtDate(cp.date)}</span>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Next step CTA */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 mb-5">
              <button
                onClick={() => navigate("/records")}
                className="w-full bg-card rounded-2xl p-4 flex items-center gap-3 shadow-card active:scale-[0.98] transition-transform"
              >
                <div className="w-10 h-10 rounded-xl gradient-orange flex items-center justify-center shadow-orange">
                  <Target size={20} className="text-primary-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">Próximo passo</p>
                  <p className="text-xs text-muted-foreground">{nextStep?.title || 'Continue sua jornada'}</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            </motion.div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
