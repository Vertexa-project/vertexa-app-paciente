import { ChevronRight, Flame, Trophy, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DAY_MILESTONES, nextDayMilestone } from "@/lib/journey";

/** Próximo marco de 30/60/90 dias, com barra de progresso até ele (PDF do Ernâni, tela 06). */
export function NextMilestoneCard({ dayNumber }: { dayNumber: number }) {
  const m = nextDayMilestone(dayNumber);
  if (!m) return null;
  const pct = Math.round((m.current / m.day) * 100);
  return (
    <div className="bg-card rounded-2xl p-4 mb-5" data-testid="next-milestone">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Próximo marco</p>
        <span className="text-[11px] text-muted-foreground">{m.current}/{m.day}</span>
      </div>
      <p className="text-sm font-semibold text-foreground mt-1">Dia {m.day} · Reavaliação com a equipe</p>
      <div role="progressbar" aria-label={`Caminho até o dia ${m.day}`} aria-valuemin={0} aria-valuemax={m.day} aria-valuenow={m.current} className="h-1.5 rounded-full bg-muted overflow-hidden mt-3">
        <div className="h-full rounded-full gradient-orange" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-1.5 mt-3">
        {DAY_MILESTONES.map((d) => (
          <span key={d} className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${d === m.day ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>Dia {d}</span>
        ))}
      </div>
    </div>
  );
}

/** Atalhos para Sequência e Desafio. */
export function JourneyShortcuts({ streak }: { streak: number }) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      <button onClick={() => navigate("/streak")} className="bg-card rounded-xl p-4 text-left active:scale-[0.98] transition-transform">
        <Flame size={18} className="text-primary mb-2" />
        <p className="text-sm font-semibold text-foreground">Sequência</p>
        <p className="text-[11px] text-muted-foreground">{streak} {streak === 1 ? "dia" : "dias"}</p>
      </button>
      <button onClick={() => navigate("/challenges")} className="bg-card rounded-xl p-4 text-left active:scale-[0.98] transition-transform">
        <Trophy size={18} className="text-primary mb-2" />
        <p className="text-sm font-semibold text-foreground">Desafio</p>
        <p className="text-[11px] text-muted-foreground">Ver ranking</p>
      </button>
    </div>
  );
}

export interface AchievementTile { code: string; title: string; icon: string; unlocked: boolean }

/** Quatro conquistas: as desbloqueadas mais recentes primeiro, completadas com as próximas travadas. */
export function pickAchievementTiles(all: AchievementTile[], n = 4): AchievementTile[] {
  const unlocked = all.filter((a) => a.unlocked);
  const locked = all.filter((a) => !a.unlocked);
  return [...unlocked, ...locked].slice(0, n);
}

export function AchievementsRow({ all }: { all: AchievementTile[] }) {
  const navigate = useNavigate();
  const tiles = pickAchievementTiles(all);
  if (tiles.length === 0) return null;
  return (
    <div className="mb-5" data-testid="achievements-row">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-display font-semibold text-foreground">Conquistas</h2>
        <button onClick={() => navigate("/achievements")} className="text-xs font-medium text-primary flex items-center">Ver todas <ChevronRight size={14} /></button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {tiles.map((a) => (
          <div key={a.code} className={`rounded-xl bg-card p-2 flex flex-col items-center gap-1 ${a.unlocked ? "" : "opacity-60"}`} data-state={a.unlocked ? "unlocked" : "locked"}>
            {a.unlocked ? <span className="text-xl">{a.icon}</span> : <Lock size={18} className="text-muted-foreground mt-0.5" />}
            <span className="text-[9px] text-muted-foreground text-center leading-tight line-clamp-2">{a.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
