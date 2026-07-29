import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Download, Share2, Copy,
  Dumbbell, Trophy, Flame, TrendingUp, Camera,
  Award, Target, Zap, ChevronRight,
  Image as ImageIcon
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ComingSoonBadge } from "@/components/ComingSoonLock";

type TemplateType = 'workout' | 'evolution' | 'challenge' | 'achievement';
type FormatType = 'story' | 'feed' | 'whatsapp';

interface ClinicData {
  name: string;
  professional: string;
}

const clinic: ClinicData = {
  name: 'Clínica Juliana Santiago',
  professional: 'Dra. Juliana Santiago',
};

const templates: { type: TemplateType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'workout', label: 'Treino concluído', icon: <Dumbbell size={20} />, desc: 'Compartilhe que finalizou o treino do dia' },
  { type: 'evolution', label: 'Evolução', icon: <TrendingUp size={20} />, desc: 'Mostre seu comparativo ou marco de evolução' },
  { type: 'challenge', label: 'Desafio / Ranking', icon: <Trophy size={20} />, desc: 'Destaque sua posição ou vitória no desafio' },
  { type: 'achievement', label: 'Conquista', icon: <Award size={20} />, desc: 'Celebre uma meta batida ou marco de constância' },
];

export default function ShareStory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as TemplateType) || null;

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(initialType);
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('story');
  const [showPreview, setShowPreview] = useState(!!initialType);

  // WP-APP-2 2.3: `shared` e `copied` foram REMOVIDOS junto com `handleShare`/`handleCopy`.
  // Eram estado puramente cosmético: o botão trocava para "Compartilhado!" por 2,5s (e "Copiado"
  // por 2s) sem ter compartilhado nem copiado coisa alguma — não há geração de imagem no app
  // (nenhum html2canvas/dom-to-image/satori; os cards são JSX, nunca rasterizados) nem chamada a
  // navigator.share/clipboard. Botão nenhum pode alegar sucesso sem ter feito nada.
  // Os três botões agora são desabilitados com o MESMO selo "Em breve" do ComingSoonLock.

  const selectTemplate = (type: TemplateType) => {
    setSelectedTemplate(type);
    setShowPreview(true);
  };

  // ── Share card renderers ──

  const renderWorkoutCard = () => (
    <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-br from-background via-card to-background border border-border">
      {/* Top gradient accent */}
      <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_60%)]" />

      <div className="relative h-full flex flex-col justify-between p-6">
        {/* Top: clinic branding */}
        <div>
          <p className="text-[10px] font-medium text-primary/80 uppercase tracking-widest mb-1">Acompanhamento profissional</p>
          <p className="text-sm font-bold text-foreground">{clinic.name}</p>
          <p className="text-[11px] text-muted-foreground">{clinic.professional}</p>
        </div>

        {/* Center: main content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Dumbbell size={32} className="text-primary" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground mb-1">Treino concluído</p>
            <p className="text-sm text-muted-foreground">Treino A — Costas e Bíceps</p>
          </div>

          <div className="flex items-center gap-6 mt-2">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">52</p>
              <p className="text-[10px] text-muted-foreground">minutos</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">18</p>
              <p className="text-[10px] text-muted-foreground">séries</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">340</p>
              <p className="text-[10px] text-muted-foreground">kcal</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/15">
            <Flame size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary">10 dias de constância</span>
          </div>
        </div>

        {/* Bottom: date + Vertexa */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground">1 de maio de 2026</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground/60 tracking-wide">via</p>
            <p className="text-[10px] font-semibold text-muted-foreground/50 tracking-wider">VERTEXA</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEvolutionCard = () => (
    <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-br from-background via-card to-background border border-border">
      <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--primary)/0.1),transparent_60%)]" />

      <div className="relative h-full flex flex-col justify-between p-6">
        <div>
          <p className="text-[10px] font-medium text-primary/80 uppercase tracking-widest mb-1">Acompanhamento profissional</p>
          <p className="text-sm font-bold text-foreground">{clinic.name}</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-5 py-6">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Evolução mensal</p>

          {/* Before/After placeholders */}
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 aspect-[3/4] rounded-xl bg-secondary border border-border flex flex-col items-center justify-center gap-2">
              <Camera size={24} className="text-muted-foreground/40" />
              <p className="text-[10px] text-muted-foreground/50">Antes</p>
              <p className="text-[9px] text-muted-foreground/30">Abr 2026</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ChevronRight size={16} className="text-primary/40" />
            </div>
            <div className="flex-1 aspect-[3/4] rounded-xl bg-secondary border border-primary/20 flex flex-col items-center justify-center gap-2">
              <Camera size={24} className="text-primary/40" />
              <p className="text-[10px] text-primary/60">Depois</p>
              <p className="text-[9px] text-muted-foreground/30">Mai 2026</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full mt-2">
            <div className="text-center p-2.5 rounded-lg bg-secondary/60 border border-border">
              <p className="text-sm font-bold text-foreground">-2.4</p>
              <p className="text-[9px] text-muted-foreground">kg perdidos</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-secondary/60 border border-border">
              <p className="text-sm font-bold text-foreground">+1.8</p>
              <p className="text-[9px] text-muted-foreground">kg massa</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-secondary/60 border border-border">
              <p className="text-sm font-bold text-foreground">92%</p>
              <p className="text-[9px] text-muted-foreground">adesão</p>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <p className="text-[10px] text-muted-foreground">{clinic.professional}</p>
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground/60 tracking-wide">via</p>
            <p className="text-[10px] font-semibold text-muted-foreground/50 tracking-wider">VERTEXA</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderChallengeCard = () => (
    <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-br from-background via-card to-background border border-border">
      <div className="absolute top-0 inset-x-0 h-2/5 bg-gradient-to-b from-primary/20 via-primary/8 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,hsl(var(--primary)/0.2),transparent_50%)]" />

      <div className="relative h-full flex flex-col justify-between p-6">
        <div>
          <p className="text-[10px] font-medium text-primary/80 uppercase tracking-widest mb-1">Acompanhamento profissional</p>
          <p className="text-sm font-bold text-foreground">{clinic.name}</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/25 to-primary/5 border-2 border-primary/30 flex items-center justify-center">
            <Trophy size={36} className="text-primary" />
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Desafio Constância Abril</p>
            <p className="text-3xl font-bold text-foreground">#4</p>
            <p className="text-sm text-muted-foreground mt-0.5">no ranking geral</p>
          </div>

          <div className="flex items-center gap-5 mt-3">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">1.060</p>
              <p className="text-[10px] text-muted-foreground">pontos</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">82%</p>
              <p className="text-[10px] text-muted-foreground">adesão</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Flame size={14} className="text-primary" />
                <p className="text-lg font-bold text-foreground">10</p>
              </div>
              <p className="text-[10px] text-muted-foreground">streak</p>
            </div>
          </div>

          <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/15 mt-2">
            <p className="text-[11px] font-medium text-primary flex items-center gap-1.5">
              <TrendingUp size={12} /> Subindo no ranking
            </p>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <p className="text-[10px] text-muted-foreground">8 participantes · 29 dias</p>
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground/60 tracking-wide">via</p>
            <p className="text-[10px] font-semibold text-muted-foreground/50 tracking-wider">VERTEXA</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAchievementCard = () => (
    <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-br from-background via-card to-background border border-border">
      <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-primary/18 via-primary/5 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,hsl(var(--primary)/0.18),transparent_55%)]" />

      <div className="relative h-full flex flex-col justify-between p-6">
        <div>
          <p className="text-[10px] font-medium text-primary/80 uppercase tracking-widest mb-1">Acompanhamento profissional</p>
          <p className="text-sm font-bold text-foreground">{clinic.name}</p>
          <p className="text-[11px] text-muted-foreground">{clinic.professional}</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/25 flex items-center justify-center">
              <Award size={44} className="text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Zap size={16} className="text-primary-foreground" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-xl font-bold text-foreground mb-1">30 dias de constância</p>
            <p className="text-sm text-muted-foreground">Meta batida com sucesso</p>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div className="text-center px-4 py-2.5 rounded-xl bg-secondary/60 border border-border">
              <p className="text-sm font-bold text-primary">100%</p>
              <p className="text-[9px] text-muted-foreground">semanas completas</p>
            </div>
            <div className="text-center px-4 py-2.5 rounded-xl bg-secondary/60 border border-border">
              <p className="text-sm font-bold text-foreground">28</p>
              <p className="text-[9px] text-muted-foreground">treinos feitos</p>
            </div>
          </div>

          <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/15 mt-1">
            <p className="text-[11px] font-medium text-primary flex items-center gap-1.5">
              <Target size={12} /> Adesão real ao acompanhamento
            </p>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <p className="text-[10px] text-muted-foreground">Maio 2026</p>
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground/60 tracking-wide">via</p>
            <p className="text-[10px] font-semibold text-muted-foreground/50 tracking-wider">VERTEXA</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCard = () => {
    switch (selectedTemplate) {
      case 'workout': return renderWorkoutCard();
      case 'evolution': return renderEvolutionCard();
      case 'challenge': return renderChallengeCard();
      case 'achievement': return renderAchievementCard();
      default: return null;
    }
  };

  const getShareLabel = () => {
    switch (selectedTemplate) {
      case 'workout': return 'Compartilhar treino';
      case 'evolution': return 'Compartilhar evolução';
      case 'challenge': return 'Compartilhar resultado';
      case 'achievement': return 'Compartilhar conquista';
      default: return 'Compartilhar';
    }
  };

  // ── Template selection screen ──
  const renderSelector = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-[430px] mx-auto">
        <button onClick={() => navigate(-1)} className="mb-6 p-2 -ml-2">
          <ArrowLeft size={24} className="text-foreground" />
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-1">Compartilhar</h1>
        <p className="text-muted-foreground text-sm mb-8">Escolha o que você quer compartilhar</p>

        <div className="space-y-3">
          {templates.map((t, i) => (
            <motion.button
              key={t.type}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => selectTemplate(t.type)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/12 flex items-center justify-center text-primary">
                {t.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              <ChevronRight size={18} className="text-muted-foreground shrink-0" />
            </motion.button>
          ))}
        </div>

        {/* Info block */}
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-8 p-4 rounded-xl bg-gradient-to-r from-primary/8 to-transparent border border-primary/10"
        >
          <div className="flex items-start gap-3">
            <Share2 size={18} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Peças prontas para compartilhar</p>
              <p className="text-xs text-muted-foreground">Compartilhe nos stories, feed ou WhatsApp com a identidade da sua clínica. Bonito, discreto e profissional.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  // ── Preview screen ──
  const renderPreview = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background pb-8">
      <div className="max-w-[430px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => { setShowPreview(false); setSelectedTemplate(null); }} className="p-1">
            <ArrowLeft size={22} className="text-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">Prévia</span>
          <div className="w-8" />
        </div>

        <div className="p-4 space-y-5">
          {/* Format selector */}
          <div className="flex items-center gap-2">
            {([
              { key: 'story' as FormatType, label: 'Story' },
              { key: 'feed' as FormatType, label: 'Feed' },
              { key: 'whatsapp' as FormatType, label: 'WhatsApp' },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setSelectedFormat(f.key)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                  selectedFormat === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Card preview */}
          <div className={`mx-auto transition-all ${
            selectedFormat === 'story' ? 'max-w-[280px]' :
            selectedFormat === 'feed' ? 'max-w-[320px]' : 'max-w-[300px]'
          }`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedTemplate}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {renderCard()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Branding info */}
          <div className="p-3 rounded-xl bg-card border border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ImageIcon size={16} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground">Branding da clínica aplicado</p>
              <p className="text-[10px] text-muted-foreground">{clinic.name} · Vertexa como assinatura</p>
            </div>
          </div>

          {/* Action buttons — DESABILITADOS (WP-APP-2 2.3).
              Compartilhar, copiar e salvar dependem de rasterizar o card em imagem, o que o app
              ainda não faz. Ficam visíveis (a tela continua existindo e a prévia é real) mas
              inertes e rotulados, em vez de fingir sucesso. */}
          <div className="space-y-3 pt-2">
            <button
              disabled
              aria-disabled
              aria-label={`${getShareLabel()} — em breve`}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
            >
              <Share2 size={18} /> {getShareLabel()}
              <ComingSoonBadge />
            </button>

            <div className="flex items-center gap-3">
              <button
                disabled
                aria-disabled
                aria-label="Copiar — em breve"
                className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-medium text-sm flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
              >
                <Copy size={16} /> Copiar
                <ComingSoonBadge />
              </button>
              <button
                disabled
                aria-disabled
                aria-label="Salvar — em breve"
                className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-medium text-sm flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
              >
                <Download size={16} /> Salvar
                <ComingSoonBadge />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      {showPreview && selectedTemplate ? renderPreview() : renderSelector()}
    </AnimatePresence>
  );
}