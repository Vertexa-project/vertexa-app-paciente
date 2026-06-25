import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { tracker } from "@/lib/eventTracker";

import screen1 from "@/assets/onboarding/01_vertexa_onboarding_bemvindo.png";
import screen2 from "@/assets/onboarding/02_vertexa_onboarding_acompanhamento.png";
import screen3 from "@/assets/onboarding/03_vertexa_onboarding_tratamento.png";
import screen4 from "@/assets/onboarding/04_vertexa_onboarding_resultados.png";
import screen5 from "@/assets/onboarding/05_vertexa_home_dashboard.png";

// Telas OFICIAIS da cliente (Sessão 3) — cada PNG já traz logo + headline + arte. O app só
// sobrepõe a navegação (dots) e o CTA; substitui os placeholders onboarding-bg-*.jpg.
const slides = [
  { img: screen1, alt: "Bem-vindo a Vertexa" },
  { img: screen2, alt: "Seu acompanhamento especializado diário" },
  { img: screen3, alt: "Seu tratamento não para aqui" },
  { img: screen4, alt: "Acompanhe seus resultados" },
  { img: screen5, alt: "Sua jornada na Vertexa" },
];

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

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= slides.length) return;
      setDirection(next > step ? 1 : -1);
      setStep(next);
    },
    [step]
  );

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 && step < slides.length - 1) goTo(step + 1);
    if (info.offset.x > 60 && step > 0) goTo(step - 1);
  };

  const finish = () => {
    tracker.track("onboarding_completed");
    navigate("/login");
  };

  const handlePrimary = () => {
    if (isLast) finish();
    else goTo(step + 1);
  };

  const slide = slides[step];

  return (
    <div className="fixed inset-0 bg-background overflow-hidden select-none">
      {/* Tela oficial (full-bleed), arrastável */}
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
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
          <img
            src={slide.img}
            alt={slide.alt}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
          {/* Gradiente apenas no rodapé para legibilidade dos controles */}
          <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Navegação + CTA */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-10 space-y-5">
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Ir para a tela ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-7 bg-primary" : "w-2 bg-white/40"
              }`}
            />
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={handlePrimary}
            className="w-full h-14 rounded-2xl gradient-orange text-primary-foreground font-semibold text-base shadow-orange active:scale-[0.97] transition-transform"
          >
            {isLast ? "Começar agora" : "Continuar"}
          </button>
          <button
            onClick={finish}
            className="w-full text-center text-primary font-semibold text-sm py-2 active:opacity-70 transition-opacity"
          >
            Fazer login
          </button>
        </div>
      </div>
    </div>
  );
}
