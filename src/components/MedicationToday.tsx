import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Pill } from "lucide-react";

import { confirmMedApplication, getMedToday } from "@/lib/api/medication";
import { formatMg, medCard, medConfirmError } from "@/lib/medication";

/** Início: "Hoje é dia da sua aplicação: Tirzepatida X mg" + "Já apliquei". Só aparece com o lembrete ligado pela clínica. */
export default function MedicationToday() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["medToday"], queryFn: getMedToday, staleTime: 60_000, retry: false });
  const done = useMutation({
    mutationFn: (id?: string) => confirmMedApplication(id),
    onSuccess: () => {
      setError(null);
      const m = q.data;
      setConfirmed(m?.medication && m.dose_mg != null ? `${m.medication} ${formatMg(m.dose_mg)}` : "");
      qc.invalidateQueries({ queryKey: ["medToday"] });
    },
    onError: (e) => setError(medConfirmError(e)),
  });
  const card = medCard(q.data);
  // Confirmação visível depois de "Já apliquei" (o cartão do dia sai porque já está em dia).
  if (confirmed !== null && (!card || done.isSuccess)) {
    return (
      <section role="status" aria-label="Aplicação registrada" className="mb-5 flex items-start gap-3 rounded-xl border border-primary/30 bg-card p-3.5">
        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-foreground">Aplicação registrada!{confirmed ? ` ${confirmed}` : ""}</p>
          <p className="mt-1 break-words text-[12px] text-muted-foreground">Sua equipe já vê esta aplicação na sua ficha.</p>
        </div>
      </section>
    );
  }
  if (!card) return null;
  return (
    <section aria-label="Aplicação de medicação" className={`mb-5 rounded-xl border bg-card p-3.5 ${card.overdue ? "border-destructive/40" : "border-primary/30"}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.overdue ? "bg-destructive/10" : "bg-primary/10"}`}>
          <Pill size={20} className={card.overdue ? "text-destructive" : "text-primary"} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium text-foreground">{card.headline}</p>
          {card.detail ? <p className="mt-1 break-words text-[12px] text-muted-foreground">{card.detail}</p> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => done.mutate(q.data?.treatment_id)}
        disabled={done.isPending}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {done.isPending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
        {card.button}
      </button>
      {error ? <p className="mt-2 text-xs text-destructive" role="alert">{error}</p> : null}
    </section>
  );
}
