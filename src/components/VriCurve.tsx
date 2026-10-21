import type { VriPoint } from "@/lib/vriBreakdown";

/** Curva do VRI desde o início, com a linha de referência de 70 (faixa alta). Pontos reais dos snapshots. */
export default function VriCurve({ points }: { points: VriPoint[] }) {
  if (points.length < 2) {
    return <p className="text-xs text-muted-foreground py-6 text-center">A curva aparece depois de alguns registros seus.</p>;
  }
  const W = 300, H = 90, PAD = 6;
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - 2 * PAD);
  const y = (s: number) => PAD + (1 - Math.max(0, Math.min(100, s)) / 100) * (H - 2 * PAD);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" role="img" aria-label={`Curva do VRI com ${points.length} pontos, de ${points[0].score} a ${points[points.length - 1].score}`}>
      <line x1={PAD} x2={W - PAD} y1={y(70)} y2={y(70)} stroke="hsl(var(--success))" strokeDasharray="3 3" strokeOpacity="0.5" />
      <path d={d} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
