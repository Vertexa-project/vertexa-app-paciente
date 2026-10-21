import { useState } from "react";

export interface SliderPhoto { url: string | null; caption: string; alt: string }

/** Antes e depois com divisor arrastável (PDF do Ernâni, tela 16). O controle é um <input range> (teclado e leitor de tela ok). */
export default function BeforeAfterSlider({ before, after }: { before: SliderPhoto; after: SliderPhoto }) {
  const [pos, setPos] = useState(50); // % da largura mostrada para o "antes" (esquerda)
  return (
    <div className="mb-4" data-testid="ba-slider">
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted select-none touch-none">
        {after.url && <img src={after.url} alt={after.alt} className="absolute inset-0 w-full h-full object-contain" draggable={false} />}
        {before.url && (
          <img src={before.url} alt={before.alt} data-testid="ba-before" className="absolute inset-0 w-full h-full object-contain bg-muted" draggable={false}
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
        )}
        <div className="absolute top-0 bottom-0 w-0.5 bg-primary pointer-events-none" style={{ left: `${pos}%` }} data-testid="ba-divider">
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-8 h-8 rounded-full gradient-orange flex items-center justify-center text-primary-foreground text-xs">⇆</div>
        </div>
        <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-background/70 text-[10px] font-semibold text-muted-foreground">{before.caption}</span>
        <span className="absolute top-2 right-2 px-2 py-1 rounded-full bg-primary/20 text-[10px] font-semibold text-primary">{after.caption}</span>
        <input
          type="range" min={0} max={100} step={1} value={pos} onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Divisor antes e depois" aria-valuetext={`${pos}% antes`}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
        />
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-2">Arraste para comparar · mesma pose, mesma luz</p>
    </div>
  );
}
