import { motion } from "framer-motion";

import tigre from "@/assets/mascot/tigre.webp";

const COLORS = ["#FE4927", "#FFB020", "#2FBF71", "#3B82F6", "#E83E8C", "#FFFFFF"];
const PIECES = Array.from({ length: 24 }, (_, i) => ({
  id: i, x: Math.cos((i / 24) * Math.PI * 2) * (90 + (i % 3) * 38), y: Math.sin((i / 24) * Math.PI * 2) * (90 + (i % 3) * 38) - 30,
  rot: (i % 2 ? 1 : -1) * (180 + i * 17), color: COLORS[i % COLORS.length], delay: (i % 6) * 0.04,
}));

/**
 * "Parabéns" da missão da 1ª semana. Efeito SEMPRE LIGADO: sem botão de desligar e sem checar prefers-reduced-motion
 * (pedido do Lucas, igual ao tigrezinho da parte 7). O framer-motion só respeita "reduzir movimento" se o app usar
 * <MotionConfig reducedMotion="user">, o que este app não faz.
 */
export default function MissionCelebration({ onClose }: { onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Parabéns, missão concluída" data-testid="mission-celebration"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="relative w-full max-w-[340px] overflow-hidden rounded-3xl bg-card p-6 text-center shadow-card">
        <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
          {PIECES.map((p) => (
            <motion.span key={p.id} data-testid="confetti-piece" aria-hidden className="absolute left-1/2 top-1/2 block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: p.color }} initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
              animate={{ x: p.x, y: p.y, opacity: [1, 1, 0], scale: [0.4, 1, 0.9], rotate: p.rot }}
              transition={{ duration: 1.4, delay: p.delay, ease: "easeOut" }} />
          ))}
          <motion.img src={tigre} alt="Tigrezinho comemorando" width={96} height={96} data-testid="celebration-tiger"
            className="h-24 w-24 rounded-full bg-white object-cover" style={{ objectPosition: "50% 38%" }}
            animate={{ scale: [1, 1.25, 0.95, 1.12, 1], rotate: [0, -12, 10, -5, 0], y: [0, -14, 0, -6, 0] }} transition={{ duration: 1.1, ease: "easeInOut", repeat: 2 }} />
        </div>
        <h2 className="mt-4 text-xl font-display font-bold text-foreground">Parabéns! 🎉</h2>
        <p className="mt-1 text-sm text-muted-foreground">Você concluiu a missão da 1ª semana. Sua equipe já pode se preparar para a sua consulta.</p>
        <button type="button" onClick={onClose} className="mt-5 h-11 w-full rounded-xl gradient-orange text-sm font-semibold text-primary-foreground">Continuar</button>
      </div>
    </div>
  );
}
