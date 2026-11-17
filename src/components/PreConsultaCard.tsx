import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight, ClipboardList } from "lucide-react";

import { getMyPreConsulta } from "@/lib/api/preConsulta";
import { cardTitle, homeCardState } from "@/lib/preConsulta";

/** Início: "Pré-consulta da sua consulta de dd/mm" abre a tela de responder; depois de enviar vira "enviada". */
export default function PreConsultaCard() {
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["myPreConsulta"], queryFn: getMyPreConsulta, staleTime: 60_000 });
  const s = homeCardState(q.data ?? null);
  if (!s) return null;
  const sent = s.kind === "enviada";
  const Icon = sent ? CheckCircle2 : ClipboardList;
  return (
    <button
      type="button"
      onClick={() => navigate("/pre-consulta")}
      className="mb-5 flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-card p-3.5 text-left active:scale-[0.98] transition-all"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon size={20} className="text-primary" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium text-foreground">{sent ? "Pré-consulta enviada" : cardTitle(s.when)}</p>
        <p className="text-[11px] text-muted-foreground">
          {sent ? "A equipe já recebeu suas respostas. Toque para rever." : s.draft ? "Você começou a responder. Toque para continuar." : "Responda umas perguntas rápidas e envie seus exames."}
        </p>
      </div>
      <ChevronRight size={16} className="text-muted-foreground" aria-hidden />
    </button>
  );
}
