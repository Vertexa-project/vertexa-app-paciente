import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BedDouble, Check, Loader2 } from "lucide-react";

import { getRestDays, markRestDay, undoRestDay } from "@/lib/api";
import { brtYmd, previousYmd, REST_DAY_LIMIT_PER_WEEK, restDayErrorMessage } from "@/lib/restDay";

/**
 * Dia de descanso: o paciente avisa que hoje (ou ontem) foi descanso. Não conta como dia ativo, mas a
 * sequência não quebra. O servidor limita a 2 por semana.
 */
export default function RestDayCard() {
  const qc = useQueryClient();
  const today = brtYmd();
  const yesterday = previousYmd(today);
  const [error, setError] = useState<string | null>(null);
  const rest = useQuery({ queryKey: ["restDays", today], queryFn: () => getRestDays(yesterday, today) });
  const days = rest.data ?? [];
  const restToday = days.includes(today);
  const restYesterday = days.includes(yesterday);

  const onDone = () => {
    setError(null);
    qc.invalidateQueries({ queryKey: ["restDays"] });
    qc.invalidateQueries({ queryKey: ["adherence"] });
  };
  const mark = useMutation({ mutationFn: (d: string) => markRestDay(d), onSuccess: onDone, onError: (e) => setError(restDayErrorMessage(e)) });
  const undo = useMutation({ mutationFn: (d: string) => undoRestDay(d), onSuccess: onDone, onError: () => setError("Não foi possível desfazer.") });
  const busy = mark.isPending || undo.isPending;

  return (
    <div className="bg-card rounded-2xl p-5 shadow-card mb-4">
      <div className="flex items-center gap-2 mb-2">
        <BedDouble size={20} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Dia de descanso</h3>
      </div>
      {restToday ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-success font-medium flex items-center gap-1.5">
            <Check size={14} /> Hoje é descanso. Sua sequência está protegida.
          </p>
          <button onClick={() => undo.mutate(today)} disabled={busy} className="text-[11px] font-semibold text-primary disabled:opacity-60">
            Desfazer
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-3">
            Descansar faz parte. Marque o dia e sua sequência não é interrompida (até {REST_DAY_LIMIT_PER_WEEK} por semana).
          </p>
          <button
            onClick={() => mark.mutate(today)}
            disabled={busy || rest.isLoading}
            className="w-full h-11 rounded-xl border border-primary text-primary font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {mark.isPending && <Loader2 size={16} className="animate-spin" />}
            Hoje é meu dia de descanso
          </button>
        </>
      )}
      {restYesterday ? (
        <p className="text-[11px] text-muted-foreground mt-2">Ontem também foi marcado como descanso.</p>
      ) : !restToday ? (
        <button onClick={() => mark.mutate(yesterday)} disabled={busy || rest.isLoading} className="text-[11px] font-semibold text-primary mt-2 disabled:opacity-60">
          Ontem foi meu descanso
        </button>
      ) : null}
      {error && <p role="alert" className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}
