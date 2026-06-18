import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { tracker } from "@/lib/eventTracker";

import bg1 from "@/assets/onboarding-bg-1.jpg";
import bg2 from "@/assets/onboarding-bg-2.jpg";
import bg3 from "@/assets/onboarding-bg-3.jpg";
import bg4 from "@/assets/onboarding-bg-4.jpg";
import bg5 from "@/assets/onboarding-bg-5.jpg";

/* ── Mockup card components (simulated app screens) ── */

const MockupHome = () => (
  <div className="bg-card rounded-2xl p-4 w-[220px] shadow-2xl border border-border/30">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-8 h-8 rounded-full bg-muted" />
      <div>
        <div className="text-[10px] text-muted-foreground">Olá,</div>
        <div className="text-xs font-semibold text-foreground">Juliana</div>
      </div>
    </div>
    <div className="bg-background rounded-xl p-3 mb-3">
      <div className="text-[9px] text-muted-foreground mb-1">Índice de adesão</div>
      <div className="flex items-center gap-2">
        <div className="relative w-12 h-12">
          <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray="97.4" strokeDashoffset="22" strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">78%</span>
        </div>
        <div>
          <div className="text-xs font-semibold text-foreground">Moderada</div>
          <div className="text-[9px] text-muted-foreground">Quase lá!</div>
        </div>
      </div>
    </div>
    <div className="space-y-2">
      {[
        { label: "Água", pct: 60, color: "bg-blue-500" },
        { label: "Treino", pct: 100, color: "bg-emerald-500" },
        { label: "Sono", pct: 80, color: "bg-violet-500" },
      ].map((g) => (
        <div key={g.label} className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground w-10">{g.label}</span>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full ${g.color}`} style={{ width: `${g.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MockupProgress = () => (
  <div className="bg-card rounded-2xl p-4 w-[220px] shadow-2xl border border-border/30">
    <div className="text-xs font-semibold text-foreground mb-3">Meu progresso</div>
    <div className="h-20 flex items-end gap-1 mb-3">
      {[40, 55, 45, 70, 65, 80, 75].map((h, i) => (
        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 5 ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }} />
      ))}
    </div>
    <div className="flex justify-between text-[8px] text-muted-foreground mb-3">
      <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
    </div>
    <div className="flex gap-2">
      <div className="flex-1 bg-background rounded-lg p-2 text-center">
        <div className="text-sm font-bold text-primary">-2.4</div>
        <div className="text-[8px] text-muted-foreground">kg este mês</div>
      </div>
      <div className="flex-1 bg-background rounded-lg p-2 text-center">
        <div className="text-sm font-bold text-emerald-500">12</div>
        <div className="text-[8px] text-muted-foreground">dias seguidos</div>
      </div>
    </div>
  </div>
);

const MockupJourney = () => (
  <div className="bg-card rounded-2xl p-4 w-[220px] shadow-2xl border border-border/30">
    <div className="text-xs font-semibold text-foreground mb-3">Minha jornada</div>
    <div className="space-y-3">
      {[
        { label: "Onboarding", done: true },
        { label: "1ª semana ativa", done: true },
        { label: "Meta batida", done: true },
        { label: "Revisão mensal", done: false, active: true },
        { label: "Manutenção", done: false },
      ].map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${s.done ? 'bg-primary text-primary-foreground' : s.active ? 'border-2 border-primary text-primary' : 'border border-muted-foreground/30 text-muted-foreground'}`}>
            {s.done ? "✓" : i + 1}
          </div>
          <span className={`text-[10px] ${s.done ? 'text-foreground' : s.active ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{s.label}</span>
        </div>
      ))}
    </div>
  </div>
);

const MockupNotifications = () => (
  <div className="bg-card rounded-2xl p-4 w-[220px] shadow-2xl border border-border/30">
    <div className="text-xs font-semibold text-foreground mb-3">Lembretes inteligentes</div>
    <div className="space-y-2">
      {[
        { icon: "💧", text: "Hora de beber água", time: "agora" },
        { icon: "🏋️", text: "Treino de hoje pendente", time: "14:00" },
        { icon: "📸", text: "Foto mensal de progresso", time: "mensal" },
        { icon: "⚡", text: "Sua constância subiu!", time: "ontem" },
      ].map((n, i) => (
        <div key={i} className="flex items-center gap-2 bg-background rounded-lg p-2">
          <span className="text-sm">{n.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-medium text-foreground truncate">{n.text}</div>
            <div className="text-[8px] text-muted-foreground">{n.time}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MockupCTA = () => (
  <div className="bg-card rounded-2xl p-4 w-[220px] shadow-2xl border border-border/30">
    <div className="text-center mb-3">
      <div className="w-14 h-14 rounded-2xl gradient-orange mx-auto flex items-center justify-center mb-2">
        <span className="text-2xl">🚀</span>
      </div>
      <div className="text-sm font-bold text-foreground">Sua jornada</div>
      <div className="text-[10px] text-muted-foreground">está pronta</div>
    </div>
    <div className="space-y-2">
      <div className="flex items-center gap-2 bg-background rounded-lg p-2">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <span className="text-[9px] text-foreground">Plano personalizado ativo</span>
      </div>
      <div className="flex items-center gap-2 bg-background rounded-lg p-2">
        <div className="w-3 h-3 rounded-full bg-primary" />
        <span className="text-[9px] text-foreground">Metas definidas</span>
      </div>
      <div className="flex items-center gap-2 bg-background rounded-lg p-2">
        <div className="w-3 h-3 rounded-full bg-blue-500" />
        <span className="text-[9px] text-foreground">Lembretes configurados</span>
      </div>
    </div>
  </div>
);

/* ── Slides data ── */

const slides = [
  {
    bg: bg1,
    headline: "Seu acompanhamento,\ntodos os dias.",
    sub: "Mais do que consulta. Continuidade real.",
    mockup: <MockupHome />,
  },
  {
    bg: bg2,
    headline: "Veja sua evolução\ncom clareza.",
    sub: "Seu progresso visível em um só lugar.",
    mockup: <MockupProgress />,
  },
  {
    bg: bg3,
    headline: "Cada passo faz parte\nda sua jornada.",
    sub: "Uma trilha pensada para sua constância.",
    mockup: <MockupJourney />,
  },
  {
    bg: bg4,
    headline: "Quando sua rotina oscila,\no sistema age.",
    sub: "Menos esquecimento. Mais adesão.",
    mockup: <MockupNotifications />,
  },
  {
    bg: bg5,
    headline: "Comece sua jornada\ncom a Vertexa.",
    sub: "Acompanhe sua evolução de forma inteligente.",
    mockup: <MockupCTA />,
  },
];

/* ── Direction tracking for animations ── */

const swipeVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const navigate = useNavigate();
  const isLast = step === slides.length - 1;

  const goTo = useCallback((next: number) => {
    if (next < 0 || next >= slides.length) return;
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }, [step]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -60 && step < slides.length - 1) goTo(step + 1);
    if (info.offset.x > 60 && step > 0) goTo(step - 1);
  };

  const handlePrimary = () => {
    if (isLast) {
      tracker.track("onboarding_completed");
      navigate("/login");
    } else {
      goTo(step + 1);
    }
  };

  const handleLogin = () => {
    tracker.track("onboarding_completed");
    navigate("/login");
  };

  const slide = slides[step];

  return (
    <div className="fixed inset-0 bg-background overflow-hidden select-none">
      {/* Background image with overlay */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={{
            enter: { opacity: 0 },
            center: { opacity: 1 },
            exit: { opacity: 0 },
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <img
            src={slide.bg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark gradient overlay — stronger at bottom for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80" />
        </motion.div>
      </AnimatePresence>

      {/* Content layer */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Logo at top */}
        <div className="pt-14 pb-4 flex justify-center">
          <h1 className="text-3xl font-display font-black tracking-[0.15em] text-white drop-shadow-lg">
            VERTEXA
          </h1>
        </div>

        {/* Mockup area — centered, swipeable */}
        <div className="flex-1 flex items-center justify-center px-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={swipeVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={handleDragEnd}
              className="cursor-grab active:cursor-grabbing"
            >
              <div className="drop-shadow-2xl">
                {slide.mockup}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom: headline + dots + CTA */}
        <div className="px-6 pb-10 space-y-5">
          {/* Headline */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="text-center"
            >
              <h2 className="text-2xl font-display font-bold leading-tight text-white whitespace-pre-line drop-shadow-md">
                {slide.headline}
              </h2>
              {slide.sub && (
                <p className="mt-2 text-sm text-white/70">
                  {slide.sub}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Pagination dots */}
          <div className="flex justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-7 bg-primary"
                    : "w-2 bg-white/40"
                }`}
              />
            ))}
          </div>

          {/* CTA buttons */}
          <div className="space-y-3">
            <button
              onClick={handlePrimary}
              className="w-full h-14 rounded-2xl gradient-orange text-primary-foreground font-semibold text-base shadow-orange active:scale-[0.97] transition-transform"
            >
              {isLast ? "Começar agora" : "Continuar"}
            </button>

            <button
              onClick={handleLogin}
              className="w-full text-center text-primary font-semibold text-sm py-2 active:opacity-70 transition-opacity"
            >
              Fazer login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
