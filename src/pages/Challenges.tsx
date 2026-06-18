import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Trophy, Users, ChevronRight, Crown, Medal, Share2, Copy, Check,
  TrendingUp, TrendingDown, Minus, Flame, Dumbbell, Apple, Target, Calendar,
  Star, Award, Shield, Clock, X, Plus, Image as ImageIcon, Info, Activity,
  Zap, Heart, CheckCircle2, ChevronDown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { tracker } from "@/lib/eventTracker";

type Screen = 'landing' | 'create' | 'scoring' | 'group' | 'invite';
type GroupTab = 'overview' | 'ranking' | 'feed' | 'details';

interface Participant {
  id: string;
  name: string;
  avatar: string;
  points: number;
  adherence: number;
  streak: number;
  trend: 'up' | 'down' | 'stable';
  position: number;
  isUser?: boolean;
}

interface FeedItem {
  id: string;
  user: string;
  avatar: string;
  action: string;
  detail: string;
  time: string;
  icon: React.ReactNode;
  points: number;
}

const participants: Participant[] = [
  { id: '1', name: 'Juliana M.', avatar: 'JM', points: 1240, adherence: 94, streak: 18, trend: 'up', position: 1 },
  { id: '2', name: 'Gabriel S.', avatar: 'GS', points: 1180, adherence: 91, streak: 15, trend: 'up', position: 2 },
  { id: '3', name: 'Ana L.', avatar: 'AL', points: 1150, adherence: 89, streak: 12, trend: 'stable', position: 3 },
  { id: '4', name: 'Você', avatar: 'VC', points: 1060, adherence: 82, streak: 10, trend: 'up', position: 4, isUser: true },
  { id: '5', name: 'Marcos R.', avatar: 'MR', points: 980, adherence: 79, streak: 8, trend: 'down', position: 5 },
  { id: '6', name: 'Carla F.', avatar: 'CF', points: 920, adherence: 76, streak: 6, trend: 'stable', position: 6 },
  { id: '7', name: 'Pedro H.', avatar: 'PH', points: 870, adherence: 72, streak: 5, trend: 'down', position: 7 },
  { id: '8', name: 'Letícia B.', avatar: 'LB', points: 810, adherence: 68, streak: 3, trend: 'up', position: 8 },
];

const feedItems: FeedItem[] = [
  { id: '1', user: 'Juliana M.', avatar: 'JM', action: 'Concluiu o treino do dia', detail: 'Treino A — Costas e Bíceps', time: '12 min', icon: <Dumbbell size={14} />, points: 40 },
  { id: '2', user: 'Gabriel S.', avatar: 'GS', action: 'Manteve 15 dias de constância', detail: 'Bônus de sequência ativado', time: '28 min', icon: <Flame size={14} />, points: 25 },
  { id: '3', user: 'Ana L.', avatar: 'AL', action: 'Completou check-in alimentar', detail: 'Todas as refeições registradas', time: '45 min', icon: <Apple size={14} />, points: 30 },
  { id: '4', user: 'Você', avatar: 'VC', action: 'Subiu para o 4º lugar', detail: 'Ultrapassou Marcos R.', time: '1h', icon: <TrendingUp size={14} />, points: 0 },
  { id: '5', user: 'Marcos R.', avatar: 'MR', action: 'Concluiu hábitos diários', detail: '5 de 5 hábitos concluídos', time: '2h', icon: <Target size={14} />, points: 35 },
  { id: '6', user: 'Carla F.', avatar: 'CF', action: 'Concluiu alongamento pré-treino', detail: 'Mobilidade de ombros e quadril', time: '3h', icon: <Heart size={14} />, points: 15 },
  { id: '7', user: 'Juliana M.', avatar: 'JM', action: 'Registrou peso semanal', detail: 'Evolução: -0.4kg na semana', time: '5h', icon: <Activity size={14} />, points: 20 },
  { id: '8', user: 'Gabriel S.', avatar: 'GS', action: 'Completou todos os hábitos', detail: 'Hidratação, sono, suplementos', time: '6h', icon: <CheckCircle2 size={14} />, points: 35 },
];

const scoringCriteria = [
  { icon: <Dumbbell size={20} />, title: 'Treino concluído', desc: 'Complete o treino prescrito no dia correto', points: 40, tier: 'principal' as const, label: 'Principal', category: 'plano' as const },
  { icon: <Target size={20} />, title: 'Hábitos diários', desc: 'Cumpra os hábitos definidos pela equipe', points: 35, tier: 'principal' as const, label: 'Principal', category: 'plano' as const },
  { icon: <Apple size={20} />, title: 'Adesão alimentar', desc: 'Registre todas as refeições do plano', points: 30, tier: 'principal' as const, label: 'Principal', category: 'plano' as const },
  { icon: <Flame size={20} />, title: 'Bônus de constância', desc: 'Sequência de 7+ dias no plano', points: 25, tier: 'principal' as const, label: 'Principal', category: 'plano' as const },
  { icon: <Activity size={20} />, title: 'Registro de peso', desc: 'Atualize seu peso semanalmente', points: 20, tier: 'principal' as const, label: 'Principal', category: 'plano' as const },
  { icon: <Heart size={20} />, title: 'Cardio / esporte extra', desc: 'Atividade fora do plano prescrito', points: 8, tier: 'complementar' as const, label: 'Complementar', category: 'extra' as const },
  { icon: <Zap size={20} />, title: 'Movimentação livre', desc: 'Caminhada, alongamento avulso, etc.', points: 5, tier: 'complementar' as const, label: 'Complementar', category: 'extra' as const },
];

const tierStyles: Record<string, { bar: string; badge: string; text: string }> = {
  principal: { bar: 'bg-primary', badge: 'bg-primary/15 text-primary', text: 'text-primary' },
  complementar: { bar: 'bg-muted-foreground/40', badge: 'bg-muted text-muted-foreground', text: 'text-muted-foreground' },
};

export default function Challenges() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('landing');
  const [groupTab, setGroupTab] = useState<GroupTab>('overview');
  const [copied, setCopied] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [accessType, setAccessType] = useState<'open' | 'restricted'>('open');

  const handleCopyLink = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp size={14} className="text-emerald-400" />;
    if (trend === 'down') return <TrendingDown size={14} className="text-red-400" />;
    return <Minus size={14} className="text-muted-foreground" />;
  };

  const getPodiumColor = (pos: number) => {
    if (pos === 1) return 'from-amber-500/20 to-amber-600/5 border-amber-500/30';
    if (pos === 2) return 'from-slate-300/15 to-slate-400/5 border-slate-400/25';
    if (pos === 3) return 'from-orange-700/15 to-orange-800/5 border-orange-700/25';
    return '';
  };

  const getPodiumIcon = (pos: number) => {
    if (pos === 1) return <Crown size={18} className="text-amber-400" />;
    if (pos === 2) return <Medal size={18} className="text-slate-300" />;
    if (pos === 3) return <Medal size={18} className="text-orange-600" />;
    return null;
  };

  // Landing screen
  const renderLanding = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-[430px] mx-auto">
        <button onClick={() => navigate(-1)} className="mb-6 p-2 -ml-2">
          <ArrowLeft size={24} className="text-foreground" />
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-1">Desafios</h1>
        <p className="text-muted-foreground text-sm mb-8">Compita pela melhor adesão ao seu plano</p>

        {/* Active Challenge Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          onClick={() => { setScreen('group'); tracker.track('plan_viewed', { context: 'challenge_group' }); }}
          className="mb-6 rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-primary/10 via-card to-card cursor-pointer"
        >
          <div className="h-32 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent flex items-center justify-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.2),transparent_70%)]" />
            <Trophy size={48} className="text-primary/60" />
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Ativo</span>
              <span className="text-xs text-muted-foreground">29 dias restantes</span>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">Desafio Constância Abril</h3>
            <p className="text-sm text-muted-foreground mb-3">Quem adere melhor ao plano sobe no ranking</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">8 participantes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Trophy size={14} className="text-primary" />
                  <span className="text-xs text-primary font-medium">#4 sua posição</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="space-y-3">
          <motion.button
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            onClick={() => setScreen('create')}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
              <Plus size={20} className="text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-foreground">Criar desafio</p>
              <p className="text-xs text-muted-foreground">Monte um grupo de competição por adesão</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </motion.button>

          <motion.button
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
              <Users size={20} className="text-foreground" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-foreground">Entrar em um grupo</p>
              <p className="text-xs text-muted-foreground">Use um código de convite para participar</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </motion.button>

          <motion.button
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            onClick={() => setScreen('scoring')}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
              <Info size={20} className="text-foreground" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-foreground">Como funciona</p>
              <p className="text-xs text-muted-foreground">Entenda a pontuação e critérios do ranking</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </motion.button>
        </div>

        {/* Motivational */}
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-8 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/10"
        >
          <div className="flex items-start gap-3">
            <Zap size={20} className="text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Sua constância move sua posição</p>
              <p className="text-xs text-muted-foreground">A maior parte da pontuação vem da adesão real ao seu acompanhamento. Atividades extras contam como bônus complementar.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  // Create challenge screen
  const renderCreate = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background">
      <div className="max-w-[430px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => setScreen('landing')} className="p-1">
            <ArrowLeft size={22} className="text-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">Criar desafio</span>
          <button
            onClick={() => setScreen('invite')}
            className="text-sm font-semibold text-primary"
          >
            Próxima
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Banner */}
          <div className="h-44 rounded-2xl bg-gradient-to-br from-card to-secondary border border-border flex flex-col items-center justify-center gap-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.08),transparent_70%)]" />
            <ImageIcon size={28} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Foto do banner</span>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center">
              <Plus size={16} className="text-foreground" />
            </div>
          </div>

          {/* Form */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <input
              type="text"
              placeholder="Nome do desafio"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="w-full bg-transparent p-4 text-foreground text-sm placeholder:text-muted-foreground outline-none border-b border-border"
            />
            <textarea
              placeholder="Descrição (opcional)"
              value={groupDesc}
              onChange={e => setGroupDesc(e.target.value)}
              rows={3}
              className="w-full bg-transparent p-4 text-foreground text-sm placeholder:text-muted-foreground outline-none resize-none"
            />
          </div>

          {/* Config */}
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-muted-foreground" />
                <span className="text-sm text-foreground">Data de início</span>
              </div>
              <span className="text-sm text-muted-foreground">11 de abr. de 2026</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-muted-foreground" />
                <span className="text-sm text-foreground">Duração</span>
              </div>
              <span className="text-sm text-muted-foreground">30 dias</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Star size={18} className="text-muted-foreground" />
                <span className="text-sm text-foreground">Pontuação</span>
              </div>
              <button onClick={() => setScreen('scoring')} className="flex items-center gap-1">
                <span className="text-sm text-primary">Adesão ao plano</span>
                <ChevronRight size={16} className="text-primary" />
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center px-4">
            A pontuação é baseada na adesão ao plano prescrito pela sua equipe profissional.
            Os critérios não podem ser alterados manualmente.
          </p>
        </div>
      </div>
    </motion.div>
  );

  // Scoring info screen
  const renderScoring = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background">
      <div className="max-w-[430px] mx-auto">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <button onClick={() => setScreen(screen === 'scoring' ? 'landing' : 'create')} className="p-1">
            <ArrowLeft size={22} className="text-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">Sistema de pontuação</span>
        </div>

        <div className="p-4">
          {/* Hero explanation */}
          <div className="rounded-2xl bg-gradient-to-br from-primary/12 via-card to-card border border-primary/10 p-5 mb-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Zap size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Seguir o plano é o que mais conta</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A maior parte da sua pontuação vem da adesão ao plano definido pela equipe. Atividades extras ajudam, mas como bônus complementar.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] font-medium text-primary">Plano principal</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                <span className="text-[10px] font-medium text-muted-foreground">Complementar</span>
              </div>
            </div>
          </div>

          {/* Plano principal section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 rounded-full bg-primary" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Plano principal</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium ml-auto">Base da pontuação</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 pl-3.5">Sua posição sobe principalmente quando você executa o plano da equipe.</p>
            <div className="space-y-2.5">
            {scoringCriteria.filter(c => c.category === 'plano').map((c, i) => (
              <motion.div
                key={i}
                initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.07 }}
                className="flex items-center gap-3.5 p-4 rounded-xl bg-card border border-border"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tierStyles[c.tier].badge}`}>
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground mb-0.5">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground">{c.desc}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${tierStyles[c.tier].bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(c.points / 40) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.2 + i * 0.07 }}
                    />
                  </div>
                </div>
                <span className={`text-sm font-bold whitespace-nowrap ${tierStyles[c.tier].text}`}>{c.points}</span>
              </motion.div>
            ))}
            </div>
          </div>

          {/* Complementar section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 rounded-full bg-muted-foreground/40" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Atividades complementares</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium ml-auto">Bônus adicional</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 pl-3.5">Atividades extras contam como bônus, mas não substituem o plano.</p>
            <div className="space-y-2.5">
            {scoringCriteria.filter(c => c.category === 'extra').map((c, i) => (
              <motion.div
                key={i}
                initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 + i * 0.07 }}
                className="flex items-center gap-3.5 p-4 rounded-xl bg-card border border-border/60"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tierStyles[c.tier].badge}`}>
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-0.5">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground/70">{c.desc}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${tierStyles[c.tier].bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(c.points / 40) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.5 + i * 0.07 }}
                    />
                  </div>
                </div>
                <span className={`text-sm font-bold whitespace-nowrap ${tierStyles[c.tier].text}`}>+{c.points}</span>
              </motion.div>
            ))}
            </div>
          </div>

          {/* Rules footer */}
          <div className="mt-6 space-y-3">
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/8 to-transparent border border-primary/10">
              <div className="flex items-start gap-3">
                <Award size={16} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground mb-0.5">O ranking prioriza constância no plano</p>
                  <p className="text-[11px] text-muted-foreground">Sua classificação é baseada na adesão ao acompanhamento profissional. Disciplina no plano vale mais que movimentação avulsa.</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-start gap-3">
                <Shield size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground mb-0.5">Falta de adesão desacelera</p>
                  <p className="text-[11px] text-muted-foreground">Dias sem registro ou treinos perdidos não geram pontos. Quem para, perde posição para quem continua.</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground font-medium">Os critérios são definidos pela Vertexa</span> e baseados no plano prescrito pela sua equipe profissional. Não podem ser alterados manualmente.
            </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Invite screen
  const renderInvite = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background">
      <div className="max-w-[430px] mx-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => setScreen('create')} className="p-1">
            <X size={22} className="text-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">Convidar participantes</span>
          <div className="w-6" />
        </div>

        <div className="p-4 space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Convide membros para o desafio compartilhando o link abaixo.
            </p>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border">
              <span className="text-xs text-muted-foreground flex-1 truncate">
                https://vertexa.app/join?code=VTX2026APR
              </span>
              <button onClick={handleCopyLink} className="text-xs font-bold text-primary flex items-center gap-1">
                {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> COPIAR</>}
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-3">Entrada de novos membros</p>
            <div className="space-y-3">
              {(['open', 'restricted'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setAccessType(type)}
                  className={`w-full flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                    accessType === type ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    accessType === type ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {accessType === type && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">
                      {type === 'open' ? 'Aberto' : 'Restrito'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {type === 'open' ? 'Qualquer pessoa com o link pode participar.' : 'Você deve aprovar cada membro.'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setScreen('group')}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Share2 size={18} />
            Compartilhar link
          </button>

          <button
            onClick={() => setScreen('group')}
            className="w-full py-3.5 rounded-xl bg-secondary text-foreground font-medium text-sm"
          >
            Agora não
          </button>
        </div>
      </div>
    </motion.div>
  );

  // Podium top 3
  const renderPodium = () => {
    const top3 = participants.slice(0, 3);
    const order = [top3[1], top3[0], top3[2]]; // 2nd, 1st, 3rd
    const heights = ['h-20', 'h-28', 'h-16'];

    return (
      <div className="flex items-end justify-center gap-3 mb-6 pt-4">
        {order.map((p, i) => (
          <div key={p.id} className="flex flex-col items-center gap-2 flex-1">
            <div className="relative">
              {i === 1 && <Crown size={16} className="text-amber-400 absolute -top-4 left-1/2 -translate-x-1/2" />}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                i === 1 ? 'border-amber-400 bg-amber-500/20 text-amber-300' :
                i === 0 ? 'border-slate-400 bg-slate-400/20 text-slate-300' :
                'border-orange-600 bg-orange-600/20 text-orange-400'
              }`}>
                {p.avatar}
              </div>
            </div>
            <span className="text-xs font-medium text-foreground truncate max-w-[70px]">{p.name}</span>
            <span className="text-[10px] text-muted-foreground">{p.points} pts</span>
            <div className={`${heights[i]} w-full rounded-t-lg ${
              i === 1 ? 'bg-gradient-to-t from-amber-500/20 to-amber-500/5' :
              i === 0 ? 'bg-gradient-to-t from-slate-400/15 to-slate-400/5' :
              'bg-gradient-to-t from-orange-600/15 to-orange-600/5'
            }`}>
              <div className="text-center pt-2">
                <span className="text-lg font-bold text-foreground">#{[2,1,3][i]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Group main screen
  const renderGroup = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background pb-8">
      <div className="max-w-[430px] mx-auto">
        {/* Header banner */}
        <div className="relative h-44 bg-gradient-to-br from-primary/25 via-primary/10 to-background">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,hsl(var(--primary)/0.25),transparent_60%)]" />
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <button onClick={() => setScreen('landing')} className="w-9 h-9 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <ArrowLeft size={18} className="text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setScreen('invite')} className="w-9 h-9 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center">
                <Share2 size={16} className="text-foreground" />
              </button>
            </div>
          </div>
          <div className="absolute bottom-4 left-4">
            <h2 className="text-xl font-bold text-foreground">Desafio Constância Abril</h2>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-around p-4 border-b border-border">
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Trophy size={14} className="text-primary" />
              <span className="text-lg font-bold text-foreground">#4</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Sua posição</span>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <span className="text-lg font-bold text-foreground">1.060</span>
            <p className="text-[10px] text-muted-foreground">Seus pontos</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <span className="text-lg font-bold text-foreground">82%</span>
            <p className="text-[10px] text-muted-foreground">Adesão</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Calendar size={14} className="text-muted-foreground" />
              <span className="text-lg font-bold text-foreground">29</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Dias restantes</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['overview', 'ranking', 'feed', 'details'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setGroupTab(tab)}
              className={`flex-1 py-3 text-xs font-medium transition-colors relative ${
                groupTab === tab ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {tab === 'overview' ? 'Geral' : tab === 'ranking' ? 'Ranking' : tab === 'feed' ? 'Atividade' : 'Detalhes'}
              {groupTab === tab && (
                <motion.div layoutId="challengeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4">
          {groupTab === 'overview' && (
            <div className="space-y-4">
              {/* Quick ranking preview */}
              <div className="rounded-xl bg-card border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-foreground">Top 3</h4>
                  <button onClick={() => setGroupTab('ranking')} className="text-xs text-primary font-medium">Ver ranking</button>
                </div>
                {participants.slice(0, 3).map((p, i) => (
                  <div key={p.id} className={`flex items-center gap-3 py-2.5 ${i < 2 ? 'border-b border-border' : ''}`}>
                    <span className="text-xs font-bold text-muted-foreground w-5">#{p.position}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      i === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/25' :
                      'bg-orange-600/20 text-orange-400 border border-orange-600/25'
                    }`}>{p.avatar}</div>
                    <span className="text-sm text-foreground flex-1">{p.name}</span>
                    <span className="text-xs font-semibold text-primary">{p.points} pts</span>
                    {getTrendIcon(p.trend)}
                  </div>
                ))}
              </div>

              {/* Your position highlight */}
              <div className="rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/15 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary border border-primary/30">VC</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Você está em #4</p>
                    <p className="text-xs text-muted-foreground">180 pts atrás do top 3 · Tendência: subindo</p>
                  </div>
                  <TrendingUp size={18} className="text-emerald-400" />
                </div>
              </div>

              {/* Recent activity preview */}
              <div className="rounded-xl bg-card border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-foreground">Atividade recente</h4>
                  <button onClick={() => setGroupTab('feed')} className="text-xs text-primary font-medium">Ver tudo</button>
                </div>
                {feedItems.slice(0, 3).map((item, i) => (
                  <div key={item.id} className={`flex items-start gap-3 py-2.5 ${i < 2 ? 'border-b border-border' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">{item.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground"><span className="font-semibold">{item.user}</span> {item.action.toLowerCase()}</p>
                      <p className="text-[10px] text-muted-foreground">{item.time} atrás</p>
                    </div>
                    {item.points > 0 && <span className="text-[10px] font-bold text-emerald-400">+{item.points}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {groupTab === 'ranking' && (
            <div className="space-y-5">
              {/* Motivational banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-primary/8 to-transparent border border-primary/10 flex items-center gap-3">
                <Zap size={16} className="text-primary shrink-0" />
                <p className="text-[11px] text-muted-foreground"><span className="text-foreground font-medium">Sua posição sobe com a adesão ao plano.</span> Atividades extras ajudam como bônus, mas o plano principal é o que mais conta.</p>
              </div>

              {/* Podium */}
              {renderPodium()}

              {/* Full ranking */}
              <div className="space-y-2">
                {participants.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: p.position * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      p.isUser ? 'bg-primary/8 border-primary/20' :
                      p.position <= 3 ? `bg-gradient-to-r ${getPodiumColor(p.position)}` : 'bg-card border-border'
                    }`}
                  >
                    <span className="text-sm font-bold text-muted-foreground w-6 text-center">
                      {p.position <= 3 ? '' : `#${p.position}`}
                    </span>
                    {p.position <= 3 && getPodiumIcon(p.position)}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      p.isUser ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary text-foreground'
                    }`}>{p.avatar}</div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className={`text-sm font-medium ${p.isUser ? 'text-primary' : 'text-foreground'}`}>{p.name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-semibold ${p.adherence >= 85 ? 'text-success' : p.adherence >= 70 ? 'text-warning' : 'text-destructive'}`}>{p.adherence}%</span>
                        <div className="w-14 h-1 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${p.adherence >= 85 ? 'bg-success' : p.adherence >= 70 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${p.adherence}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Flame size={10} />{p.streak}d
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-sm font-bold text-foreground">{p.points}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-muted-foreground">pts</span>
                        {getTrendIcon(p.trend)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Scoring link */}
              <button
                onClick={() => setScreen('scoring')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-card border border-border text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                <Info size={14} />
                Como sua pontuação é construída
              </button>
            </div>
          )}

          {groupTab === 'feed' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-4">Atualizações baseadas na adesão real dos participantes</p>
              {feedItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-card/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground flex-shrink-0">{item.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{item.user}</span>
                    </p>
                    <p className="text-xs text-foreground/80">{item.action}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.detail}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{item.time} atrás</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {item.icon}
                    </div>
                    {item.points > 0 && (
                      <span className="text-[10px] font-bold text-emerald-400">+{item.points} pts</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {groupTab === 'details' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-card border border-border p-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground mb-2">Informações do desafio</h4>
                {[
                  { label: 'Período', value: '11 Abr – 10 Mai 2026' },
                  { label: 'Duração', value: '30 dias' },
                  { label: 'Participantes', value: '8 membros' },
                  { label: 'Critério', value: 'Adesão ao plano profissional' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-card border border-border p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Estatísticas do grupo</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Check-ins válidos', value: '186', icon: <CheckCircle2 size={16} /> },
                    { label: 'Média de adesão', value: '82%', icon: <Target size={16} /> },
                    { label: 'Treinos concluídos', value: '94', icon: <Dumbbell size={16} /> },
                    { label: 'Hábitos concluídos', value: '312', icon: <Star size={16} /> },
                    { label: 'Maior sequência', value: '18 dias', icon: <Flame size={16} /> },
                    { label: 'Taxa de constância', value: '78%', icon: <Shield size={16} /> },
                  ].map((stat, i) => (
                    <div key={i} className="p-3 rounded-lg bg-secondary/50 border border-border">
                      <div className="text-primary mb-1.5">{stat.icon}</div>
                      <p className="text-lg font-bold text-foreground">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-card border border-border p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Participantes</h4>
                <div className="space-y-2">
                  {participants.map(p => (
                    <div key={p.id} className="flex items-center gap-3 py-1.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        p.isUser ? 'bg-primary/20 text-primary' : 'bg-secondary text-foreground'
                      }`}>{p.avatar}</div>
                      <span className="text-sm text-foreground flex-1">{p.name}</span>
                      <span className="text-xs text-muted-foreground">#{p.position}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      {screen === 'landing' && renderLanding()}
      {screen === 'create' && renderCreate()}
      {screen === 'scoring' && renderScoring()}
      {screen === 'invite' && renderInvite()}
      {screen === 'group' && renderGroup()}
    </AnimatePresence>
  );
}
