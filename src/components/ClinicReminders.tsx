import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, FlaskConical } from "lucide-react";

import { getMyReminders } from "@/lib/api";
import { reminderCards } from "@/lib/reminders";
import { useMe } from "@/hooks/useMe";

/** Avisos de exame e retorno que a clínica cadastrou (A2). Só aparece dentro da janela de aviso; no dia de Brasília. */
export default function ClinicReminders() {
  const { me } = useMe();
  const q = useQuery({ queryKey: ["myReminders"], queryFn: getMyReminders, staleTime: 60_000 });
  const cards = useMemo(() => reminderCards(q.data ?? [], me.name), [q.data, me.name]);
  if (cards.length === 0) return null;
  return (
    <section aria-label="Avisos da clínica" className="mb-5 space-y-2.5">
      {cards.map((c) => {
        const Icon = c.kind === "return" ? CalendarClock : FlaskConical;
        return (
          <div key={c.id} className={`flex items-start gap-3 rounded-xl border bg-card p-3.5 ${c.overdue ? "border-destructive/40" : "border-primary/30"}`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.overdue ? "bg-destructive/10" : "bg-primary/10"}`}>
              <Icon size={20} className={c.overdue ? "text-destructive" : "text-primary"} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2">
                <p className="break-words text-sm font-medium text-foreground">{c.headline}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.overdue ? "bg-destructive/15 text-destructive" : c.today ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {c.today ? "Hoje" : c.overdue ? `Atrasado · ${c.date}` : `${c.when} · ${c.date}`}
                </span>
              </div>
              <p className="mt-1 break-words text-[12px] text-muted-foreground">{c.message}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
