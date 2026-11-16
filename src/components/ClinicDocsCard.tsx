import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronRight, FileText } from "lucide-react";

import { getMyDeliveries } from "@/lib/api";
import { unopened } from "@/lib/deliveries";

/** Aviso no Início: documentos novos que a clínica enviou e a paciente ainda não abriu. */
export default function ClinicDocsCard() {
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["myDeliveries"], queryFn: getMyDeliveries, staleTime: 60_000 });
  const n = unopened(q.data ?? []);
  if (n === 0) return null;
  return (
    <button
      type="button"
      onClick={() => navigate("/documents")}
      className="mb-5 flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-card p-3.5 text-left active:scale-[0.98] transition-all"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <FileText size={20} className="text-primary" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{n === 1 ? "1 documento novo da clínica" : `${n} documentos novos da clínica`}</p>
        <p className="text-[11px] text-muted-foreground">Toque para abrir em Meus documentos.</p>
      </div>
      <ChevronRight size={16} className="text-muted-foreground" aria-hidden />
    </button>
  );
}
