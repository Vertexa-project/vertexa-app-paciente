import { motion } from "framer-motion";
import { ArrowLeft, Share2, Lock, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAchievements } from "@/hooks/useAchievements";
import { getLatestAdherenceState } from "@/lib/api";
import type { AchievementView, AchievementCategory } from "@/lib/api";
import BottomNav from "@/components/BottomNav";
import { ComingSoonBadge } from "@/components/ComingSoonLock";

const categoryLabels: Record<AchievementCategory, string> = {
  first_step: "Primeiros passos",
  streak: "Constância",
  weight: "Peso",
};
const categoryOrder: AchievementCategory[] = ["first_step", "streak", "weight"];

// "02 Jul" a partir do unlocked_at (fuso local). Vazio quando não há data.
function unlockDateLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const mon = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${String(d.getDate()).padStart(2, "0")} ${mon.charAt(0).toUpperCase()}${mon.slice(1)}`;
}

export default function Achievements() {
  const navigate = useNavigate();
  const { all, unlockedCount, totalCount, recent, isLoading, isError } = useAchievements();

  // Sequência atual (streak) = LEITURA do último snapshot do VRI (mesma fonte da Home; NÃO recomputa).
  const adherenceQuery = useQuery({ queryKey: ["adherence"], queryFn: getLatestAdherenceState });
  const streak = adherenceQuery.data?.streak ?? 0;

  const featured = recent[0]; // conquista mais recente -> card compartilhável
  const byCategory = (cat: AchievementCategory): AchievementView[] => all.filter((a) => a.category === cat);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Conquistas</h1>
        </div>

        {/* Resumo (real): destravadas / total + sequência atual */}
        <div className="flex items-center gap-4 mb-6 bg-card rounded-2xl p-4 shadow-card">
          <div className="w-14 h-14 rounded-2xl gradient-orange flex items-center justify-center shadow-orange">
            <span className="text-2xl">🏆</span>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">
              {isLoading || isError ? "—" : unlockedCount}
            </p>
            <p className="text-xs text-muted-foreground">de {isLoading || isError ? "—" : totalCount} conquistas</p>
          </div>
          {streak > 0 && (
            <div className="ml-auto text-right">
              <p className="text-sm font-semibold text-primary flex items-center gap-1 justify-end">
                <Zap size={14} /> {streak} dias
              </p>
              <p className="text-xs text-muted-foreground">sequência atual</p>
            </div>
          )}
        </div>

        {isError ? (
          <p className="text-xs text-red-400 text-center py-6">Não foi possível carregar suas conquistas.</p>
        ) : isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[68px] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Card compartilhável = conquista mais recente (some quando nada foi destravado) */}
            {featured && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl p-5 shadow-card mb-5 border border-primary/20"
              >
                {/* WP-APP-2 2.3: o botão abaixo nunca teve onClick — clicar nele não fazia
                    absolutamente nada, mas ele tinha aparência de ação disponível. Agora está
                    desabilitado e o selo "Em breve" (o MESMO de ComingSoonLock) diz por quê. */}
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[10px] text-primary font-semibold uppercase tracking-wider">Compartilhar conquista</p>
                  <ComingSoonBadge />
                </div>
                <div className="bg-muted rounded-xl p-4 flex items-center gap-3">
                  <span className="text-3xl">{featured.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{featured.title}</p>
                    <p className="text-[10px] text-muted-foreground">Estou evoluindo com a VERTEXA 💪</p>
                  </div>
                  <button
                    disabled
                    aria-disabled
                    aria-label="Compartilhar conquista — em breve"
                    title="Compartilhar conquista — em breve"
                    className="w-9 h-9 rounded-full gradient-orange flex items-center justify-center shadow-orange opacity-50 cursor-not-allowed"
                  >
                    <Share2 size={14} className="text-primary-foreground" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Lista agrupada por categoria (ordem do catálogo) */}
            {categoryOrder.map((cat) => {
              const items = byCategory(cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="mb-5">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {categoryLabels[cat]}
                  </h2>
                  <div className="flex flex-col gap-3">
                    {items.map((a, i) => (
                      <motion.div
                        key={a.code}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`bg-card rounded-xl p-4 flex items-center gap-3 ${!a.unlocked ? "opacity-50" : ""}`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.unlocked ? "bg-primary/10" : "bg-muted"}`}>
                          {a.unlocked ? <span className="text-2xl">{a.icon}</span> : <Lock size={20} className="text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{a.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.unlocked ? unlockDateLabel(a.unlockedAt) : a.description}
                          </p>
                        </div>
                        {/* Mesmo caso do botão do card em destaque: sem onClick, sem ação.
                            Desabilitado. Aqui o selo visível não cabe na linha, então o rótulo
                            "em breve" vai em aria-label/title — leitor de tela e toque longo
                            recebem exatamente a mesma informação. */}
                        {a.unlocked && (
                          <button
                            disabled
                            aria-disabled
                            aria-label={`Compartilhar ${a.title} — em breve`}
                            title="Compartilhar — em breve"
                            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 opacity-50 cursor-not-allowed"
                          >
                            <Share2 size={14} className="text-muted-foreground" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
