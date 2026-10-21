import { WEEKDAY_SHORT } from "@/lib/weeklySummary";

/** Barras de kcal estimadas por dia (seg→dom). Alturas proporcionais ao maior dia; dia sem dado = barra mínima apagada. */
export default function KcalBars({ values, todayIndex }: { values: number[]; todayIndex: number }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-2 h-28" role="img" aria-label={`kcal estimadas por dia: ${values.map((v, i) => `${WEEKDAY_SHORT[i]} ${v}`).join(", ")}`}>
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
          <span className="text-[9px] text-muted-foreground">{v > 0 ? v : ""}</span>
          <div
            data-testid={`kcal-bar-${i}`} data-empty={v === 0}
            className={`w-full rounded-md ${v > 0 ? "gradient-orange" : "bg-muted"} ${i === todayIndex ? "ring-1 ring-primary/60" : ""}`}
            style={{ height: `${v > 0 ? Math.max(8, Math.round((v / max) * 72)) : 6}px` }}
          />
          <span className="text-[9px] font-medium text-muted-foreground">{WEEKDAY_SHORT[i]}</span>
        </div>
      ))}
    </div>
  );
}
