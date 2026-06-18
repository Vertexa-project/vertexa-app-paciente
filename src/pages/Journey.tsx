import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Circle, ChevronRight, Zap, Trophy, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getJourneyCheckpoints, getAdherenceState } from "@/lib/adherenceEngine";
import { tracker } from "@/lib/eventTracker";
import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";

const phaseLabels: Record<string, { label: string; description: string; icon: string }> = {
  inicio: { label: 'Início', description: 'Primeiros passos na sua jornada', icon: '🌱' },
  constancia_inicial: { label: 'Constância inicial', description: 'Criando hábitos sólidos', icon: '🔥' },
  acompanhamento_ativo: { label: 'Acompanhamento ativo', description: 'Em ritmo de evolução', icon: '📈' },
  revisao_progresso: { label: 'Revisão de progresso', description: 'Avaliando conquistas', icon: '📊' },
  manutencao: { label: 'Manutenção', description: 'Consolidando resultados', icon: '🏆' },
};

const phases = ['inicio', 'constancia_inicial', 'acompanhamento_ativo', 'revisao_progresso', 'manutencao'];

export default function Journey() {
  const navigate = useNavigate();
  const state = getAdherenceState();
  const checkpoints = getJourneyCheckpoints();
  const completedCount = checkpoints.filter(c => c.completed).length;
  const currentPhaseIdx = phases.indexOf(state.journeyPhase);

  useEffect(() => { tracker.track('journey_viewed'); }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Minha Jornada</h1>
        </div>

        {/* Current Phase */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 shadow-card mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl gradient-orange flex items-center justify-center shadow-orange">
              <span className="text-2xl">{phaseLabels[state.journeyPhase].icon}</span>
            </div>
            <div className="flex-1">
              <p className="text-xs text-primary font-semibold uppercase tracking-wider">Fase atual</p>
              <p className="text-base font-display font-bold text-foreground">{phaseLabels[state.journeyPhase].label}</p>
              <p className="text-xs text-muted-foreground">{phaseLabels[state.journeyPhase].description}</p>
            </div>
          </div>

          {/* Phase progress bar */}
          <div className="flex gap-1.5">
            {phases.map((p, i) => (
              <div key={p} className="flex-1 flex flex-col items-center gap-1">
                <div className={`h-1.5 rounded-full w-full ${i <= currentPhaseIdx ? 'gradient-orange' : 'bg-muted'}`} />
                <span className="text-[8px] text-muted-foreground">{phaseLabels[p].icon}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-card rounded-xl p-3 text-center">
            <Zap size={18} className="text-primary mx-auto mb-1" />
            <p className="text-lg font-display font-bold text-foreground">{state.streak}</p>
            <p className="text-[10px] text-muted-foreground">dias seguidos</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center">
            <Trophy size={18} className="text-warning mx-auto mb-1" />
            <p className="text-lg font-display font-bold text-foreground">{completedCount}</p>
            <p className="text-[10px] text-muted-foreground">marcos atingidos</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center">
            <Target size={18} className="text-success mx-auto mb-1" />
            <p className="text-lg font-display font-bold text-foreground">{state.score}%</p>
            <p className="text-[10px] text-muted-foreground">índice VRI</p>
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-base font-display font-semibold text-foreground mb-4">Linha do tempo</h2>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            
            <div className="flex flex-col gap-1">
              {checkpoints.map((cp, i) => (
                <motion.div
                  key={cp.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.05 }}
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
                      {cp.date && <span className="text-[10px] text-muted-foreground shrink-0">{cp.date}</span>}
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
              <p className="text-xs text-muted-foreground">
                {checkpoints.find(c => !c.completed)?.title || 'Continue sua jornada'}
              </p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
