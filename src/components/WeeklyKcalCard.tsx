import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import KcalBars from "@/components/KcalBars";
import { useWeeklySummary } from "@/hooks/useWeeklySummary";

/** Cartão da Evolução (PDF do Ernâni, tela 13): kcal estimadas da semana em barras + atalho ao resumo. */
export default function WeeklyKcalCard() {
  const navigate = useNavigate();
  const { summary: s, isLoading, isError } = useWeeklySummary();
  if (isLoading) return <div className="h-40 rounded-2xl bg-muted animate-pulse mb-5" />;
  if (isError || !s) return null; // o resumo completo mostra o erro com "tentar novamente"
  return (
    <div className="bg-card rounded-2xl p-5 shadow-card mb-5" data-testid="weekly-kcal-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Kcal estimadas da semana</h3>
        <span className="text-xs font-semibold text-primary">{s.kcalTotal.toLocaleString("pt-BR")} kcal</span>
      </div>
      <KcalBars values={s.kcalByDay} todayIndex={(new Date().getDay() + 6) % 7} />
      <button onClick={() => navigate("/weekly-summary")} className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-medium text-primary">
        Ver resumo da semana <ChevronRight size={14} />
      </button>
    </div>
  );
}
