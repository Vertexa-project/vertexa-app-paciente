import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ClipboardCheck, Loader2, MessageSquareText, Scale } from "lucide-react";

import { getMyRoutine, logRoutineEntry } from "@/lib/api/routine";
import { dayMonth, ROUTINE_ACTION, routineSummary, routineTitle } from "@/lib/routineCards";

const MAX_FEEDBACK = 1000;

/** A4 — cartão de tarefa da rotina no Início. Fica até concluir (os registros reais de foto/peso e o feedback fecham sozinhos). */
export default function RoutineTaskCard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["myRoutine"], queryFn: getMyRoutine });
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const send = useMutation({
    mutationFn: (note: string) => logRoutineEntry("feedback", note),
    onSuccess: () => { setText(""); setError(null); qc.invalidateQueries({ queryKey: ["myRoutine"] }); },
    onError: () => setError("Não foi possível enviar. Tente de novo."),
  });

  const view = q.data;
  if (!view || !view.enabled || view.current.length === 0) return null;
  const overdue = view.current.some((c) => c.state === "overdue");

  return (
    <section aria-label="Rotina do dia" data-testid="routine-card" className={`mb-5 rounded-2xl border bg-card p-4 ${overdue ? "border-destructive/40" : "border-primary/40"}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <ClipboardCheck size={20} className="text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground" data-testid="routine-title">{routineTitle(view.current)}: {routineSummary(view.current)}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{overdue ? "Ficou pendente — leva um minutinho." : "É hoje! Leva um minutinho."}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-3">
        {view.current.map((c) => (
          <li key={c.key} className="rounded-xl bg-muted/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 break-words text-sm font-medium text-foreground">{c.label}</p>
              {c.state === "overdue" ? <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">Atrasado · {dayMonth(c.due_on)}</span> : <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">Hoje</span>}
            </div>
            {c.key === "feedback" ? (
              <div className="mt-2 space-y-2">
                <label htmlFor="routine-feedback" className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><MessageSquareText size={14} aria-hidden /> Como foi a sua semana?</label>
                <textarea id="routine-feedback" value={text} maxLength={MAX_FEEDBACK} rows={3} onChange={(e) => setText(e.target.value)}
                  placeholder="Conte como foi a alimentação, o treino, o sono…" className="w-full resize-none rounded-lg border border-border bg-background p-2.5 text-sm text-foreground" />
                {error ? <p role="alert" className="text-[12px] text-destructive">{error}</p> : null}
                <button type="button" disabled={send.isPending || text.trim() === ""} onClick={() => send.mutate(text.trim())}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg gradient-orange text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  {send.isPending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}Enviar feedback
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => navigate(ROUTINE_ACTION[c.key].to)}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg gradient-orange text-sm font-semibold text-primary-foreground">
                {c.key === "photo" ? <Camera size={16} aria-hidden /> : <Scale size={16} aria-hidden />}{ROUTINE_ACTION[c.key].label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
