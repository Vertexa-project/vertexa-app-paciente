import { useState } from "react";
import { ArrowLeft, Trophy, Crown, Info, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getClinicRanking, isInRanking, joinRanking, leaveRanking, type RankingPeriod } from "@/lib/api";
import { DAILY_CAP, POINT_RULES, me, pointsToNext, positionLabel } from "@/lib/ranking";
import BottomNav from "@/components/BottomNav";

const PERIODS: { id: RankingPeriod; label: string }[] = [{ id: "week", label: "Semana" }, { id: "month", label: "Mês" }];

function Rules() {
  return (
    <div className="bg-card rounded-2xl p-4 mb-4" data-testid="ranking-rules">
      <div className="flex items-center gap-2 mb-3"><Info size={14} className="text-primary" /><p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Como se ganha ponto</p></div>
      <ul className="space-y-2">
        {POINT_RULES.map((r) => (
          <li key={r.label} className="flex items-center justify-between text-sm"><span className="text-foreground">{r.label}</span><span className="font-semibold text-primary">+{r.points}</span></li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground mt-3">No máximo {DAILY_CAP} pontos por dia. Sem prêmio em dinheiro: vale a posição.</p>
    </div>
  );
}

export default function Challenges() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<RankingPeriod>("week");
  const member = useQuery({ queryKey: ["rankingMember"], queryFn: isInRanking });
  const rows = useQuery({ queryKey: ["clinicRanking", period], queryFn: () => getClinicRanking(period), enabled: member.data === true });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["rankingMember"] }); void qc.invalidateQueries({ queryKey: ["clinicRanking"] }); };
  const join = useMutation({ mutationFn: joinRanking, onSuccess: refresh });
  const leave = useMutation({ mutationFn: leaveRanking, onSuccess: refresh });

  const list = rows.data ?? [];
  const mine = me(list);
  const gap = pointsToNext(list);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="w-10 h-10 rounded-full bg-card flex items-center justify-center"><ArrowLeft size={18} /></button>
        <h1 className="text-xl font-display font-bold text-foreground">Desafio</h1>
      </div>

      <div className="px-5">
        {member.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : member.isError ? (
          <p className="text-sm text-muted-foreground" role="alert">Não foi possível carregar o ranking agora.</p>
        ) : !member.data ? (
          <>
            <div className="bg-card rounded-2xl p-5 mb-4" data-testid="ranking-consent">
              <Trophy size={28} className="text-primary mb-3" />
              <p className="text-base font-semibold text-foreground mb-1">Ranking da sua clínica</p>
              <p className="text-sm text-muted-foreground mb-3">Compare sua constância com os outros pacientes da mesma clínica. Só entra quem aceitar.</p>
              <div className="flex gap-2 rounded-xl bg-muted/50 p-3 mb-4">
                <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">Os outros veem apenas suas <strong>iniciais</strong> e seus pontos. Nome, peso, fotos e o que você registra continuam só seus. Você pode sair quando quiser.</p>
              </div>
              <button onClick={() => join.mutate()} disabled={join.isPending} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Participar do ranking</button>
              {join.isError && <p className="text-xs text-destructive mt-2" role="alert">Não foi possível entrar agora. Tente de novo.</p>}
            </div>
            <Rules />
          </>
        ) : (
          <>
            <div className="flex gap-2 mb-4" role="group" aria-label="Período">
              {PERIODS.map((p) => (
                <button key={p.id} onClick={() => setPeriod(p.id)} aria-pressed={period === p.id}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium ${period === p.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>{p.label}</button>
              ))}
            </div>

            {rows.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : rows.isError ? (
              <p className="text-sm text-muted-foreground" role="alert">Não foi possível carregar o ranking agora.</p>
            ) : (
              <>
                {mine && (
                  <div className="bg-card rounded-2xl p-5 mb-4 text-center" data-testid="my-position">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Sua posição</p>
                    <p className="text-4xl font-display font-bold text-primary">{positionLabel(mine.position)}</p>
                    <p className="text-sm text-foreground mt-1">{mine.points} pontos · {mine.activeDays} {mine.activeDays === 1 ? "dia" : "dias"} com registro</p>
                    {gap !== null && <p className="text-xs text-muted-foreground mt-2">Faltam {gap} {gap === 1 ? "ponto" : "pontos"} para subir.</p>}
                  </div>
                )}
                {list.length <= 1 && <p className="text-sm text-muted-foreground mb-4" role="note">Você é a primeira a entrar. Quando outros pacientes da clínica aceitarem, eles aparecem aqui.</p>}
                <ul className="bg-card rounded-2xl mb-4" data-testid="ranking-list">
                  {list.map((r, i) => (
                    <li key={`${r.initials}-${i}`} className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 ${r.isMe ? "bg-primary/10" : ""}`}>
                      <span className="w-7 text-sm font-semibold text-muted-foreground flex items-center">{r.position === 1 ? <Crown size={16} className="text-primary" /> : r.position}</span>
                      <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">{r.initials}</span>
                      <span className="flex-1 text-sm text-foreground">{r.isMe ? "Você" : "Paciente"}</span>
                      <span className="text-sm font-semibold text-foreground">{r.points} pts</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Rules />
            <button onClick={() => leave.mutate()} disabled={leave.isPending} className="w-full py-3 text-sm text-muted-foreground">Sair do ranking</button>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
