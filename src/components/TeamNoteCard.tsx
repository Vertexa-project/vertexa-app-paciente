import { useQuery } from "@tanstack/react-query";
import { MessageSquareText } from "lucide-react";

import { getMyWeeklyNote } from "@/lib/api";
import { localDateKey } from "@/lib/pendingLogic";
import { weekStart } from "@/lib/weeklySummary";

/** Recado da semana que o profissional escreveu e aprovou (mesma fonte do Resumo da semana). Sem recado, não aparece. */
export default function TeamNoteCard() {
  const weekKey = localDateKey(weekStart(new Date()));
  const note = useQuery({ queryKey: ["weeklyTeamNote", weekKey], queryFn: () => getMyWeeklyNote(weekKey) });
  const text = note.data?.trim();
  if (!text) return null;
  return (
    <section aria-label="Recado da equipe" data-testid="team-note" className="mb-5 rounded-2xl border border-border bg-card p-3.5">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <MessageSquareText size={12} aria-hidden /> Recado da equipe
      </p>
      <p className="whitespace-pre-line break-words text-sm text-foreground">{text}</p>
    </section>
  );
}
