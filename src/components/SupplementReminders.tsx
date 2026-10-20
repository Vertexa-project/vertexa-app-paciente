import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Pill } from "lucide-react";

import { getMySupplements, getSupplementsTakenToday, toggleSupplementTaken } from "@/lib/api";
import { localDateKey } from "@/lib/pendingLogic";
import { tracker } from "@/lib/eventTracker";
import { dueReminders, reminderLabel } from "@/lib/supplementReminders";

const MAX_SHOWN = 3;

/**
 * Lembrete dentro do app: "Hora de tomar" para suplementos/medicamentos cujo horário já passou e que ainda não
 * foram marcados hoje. Reavalia a cada minuto. (Aviso no celular com o app fechado é outra entrega.)
 */
export default function SupplementReminders() {
  const qc = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const todayKey = localDateKey(now);
  const list = useQuery({ queryKey: ["supplements"], queryFn: getMySupplements });
  const taken = useQuery({ queryKey: ["supplementsTakenToday", todayKey], queryFn: getSupplementsTakenToday, enabled: (list.data?.length ?? 0) > 0 });
  const mark = useMutation({
    mutationFn: (supplementId: string) => toggleSupplementTaken({ supplementId, on: true }),
    onSuccess: (_d, supplementId) => {
      tracker.track("supplement_checked", { supplement_id: supplementId });
      void qc.invalidateQueries({ queryKey: ["supplementsTakenToday"] });
    },
  });

  const due = dueReminders(list.data ?? [], taken.data ?? new Set<string>(), now);
  if (due.length === 0) return null;

  return (
    <section aria-label="Lembretes de suplementos e medicamentos" className="mb-5 rounded-xl border border-primary/25 bg-primary/5 p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <Bell size={14} className="text-primary" />
        <h2 className="text-sm font-display font-semibold text-foreground">Hora de tomar</h2>
      </div>
      <ul className="space-y-2">
        {due.slice(0, MAX_SHOWN).map((s) => (
          <li key={s.id} className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
              <Pill size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {[s.dose, `às ${reminderLabel(s.reminder_time)}`].filter(Boolean).join(" • ")}
              </p>
            </div>
            <button
              onClick={() => mark.mutate(s.id)}
              disabled={mark.isPending}
              aria-label={`Marcar ${s.name} como tomado`}
              className="flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Check size={14} /> Tomei
            </button>
          </li>
        ))}
      </ul>
      {due.length > MAX_SHOWN && <p className="mt-2 text-[11px] text-muted-foreground">e mais {due.length - MAX_SHOWN} em Meu Plano → Suplementos</p>}
    </section>
  );
}
