// PDF do Ernâni (tela 08): "Progresso geral 7 de 16" com barra e porcentagem.
export function achievementsPercent(unlocked: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((unlocked / total) * 100)));
}

export default function AchievementsProgress({ unlocked, total }: { unlocked: number; total: number }) {
  const pct = achievementsPercent(unlocked, total);
  return (
    <div className="mb-6 bg-card rounded-2xl p-4" data-testid="achievements-progress">
      <div className="flex items-center gap-3">
        <div
          role="progressbar" aria-label="Progresso das conquistas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
          className="flex-1 h-2 rounded-full bg-muted overflow-hidden"
        >
          <div className="h-full rounded-full gradient-orange" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-semibold text-primary">{pct}%</span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">{unlocked} de {total} desbloqueadas</p>
    </div>
  );
}
