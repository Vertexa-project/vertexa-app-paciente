import type { SupplementWeek } from "@/lib/supplementWeek";

const LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

/** Cartão "Adesão da semana" (tela 24): X/Y e barra, só com dado real. */
export function WeekAdherenceCard({ week }: { week: SupplementWeek }) {
  if (week.expected === 0) return null;
  const pct = Math.round((week.taken / week.expected) * 100);
  return (
    <div className="bg-card rounded-xl p-4" data-testid="supplement-week-card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-foreground">Adesão da semana</p>
        <span className="text-xs font-semibold text-primary">{week.taken}/{week.expected}</span>
      </div>
      <div role="progressbar" aria-label="Adesão da semana" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full gradient-orange" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Linha dos 7 dias de um item: tomou (laranja), não tomou (apagado), ainda não existia (vazio). */
export function WeekStrip({ flags, days, name }: { flags: (boolean | null)[]; days: string[]; name: string }) {
  return (
    <div className="flex gap-1.5 mt-2" role="group" aria-label={`Semana de ${name}`}>
      {flags.map((f, i) => {
        const dow = new Date(`${days[i]}T12:00:00`).getDay();
        const label = f === null ? "não existia" : f ? "tomado" : "não tomado";
        return (
          <span
            key={days[i]} title={`${days[i]} · ${label}`} data-state={f === null ? "none" : f ? "taken" : "missed"}
            className={`flex-1 h-6 rounded-md text-[9px] font-semibold flex items-center justify-center ${
              f ? "bg-primary/20 text-primary" : f === false ? "bg-muted text-muted-foreground" : "border border-dashed border-border text-muted-foreground/40"
            }`}
          >
            {LETTERS[dow]}
          </span>
        );
      })}
    </div>
  );
}
