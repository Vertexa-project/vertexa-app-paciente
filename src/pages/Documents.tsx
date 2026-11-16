import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import BottomNav from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyDeliveries, openDelivery } from "@/lib/api";
import { DELIVERY_KIND_LABEL, downloadName, fileSizeText, sentDateBR, type DeliveryRow } from "@/lib/deliveries";
import { captureException } from "@/lib/observability/sentry";

/** Meus documentos: PDFs com a marca da clínica (treino, plano alimentar, relatórios) enviados pela equipe. */
export default function Documents() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["myDeliveries"], queryFn: getMyDeliveries });
  const [error, setError] = useState<string | null>(null);
  const open = useMutation({
    mutationFn: async (d: DeliveryRow) => ({ d, url: await openDelivery(d) }),
    onSuccess: ({ d, url }) => {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = downloadName(d);
      document.body.appendChild(a);
      a.click();
      a.remove();
      qc.invalidateQueries({ queryKey: ["myDeliveries"] });
    },
    onError: (e) => {
      captureException(e, { source: "storage", scope: "open-delivery" });
      setError("Não foi possível abrir o documento. Tente novamente.");
    },
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} aria-label="Voltar" className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Meus documentos</h1>
        </div>

        {list.isPending ? (
          <div className="space-y-2.5" role="status" aria-label="Carregando documentos">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : list.isError ? (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Não foi possível carregar seus documentos.{" "}
            <button type="button" className="text-primary font-medium" onClick={() => list.refetch()}>Tentar de novo</button>
          </div>
        ) : (list.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <FileText size={28} className="mx-auto mb-2 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">Nenhum documento ainda</p>
            <p className="mt-1 text-xs text-muted-foreground">Quando a clínica enviar seu treino, plano alimentar ou um relatório, ele aparece aqui.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {(list.data ?? []).map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => { setError(null); open.mutate(d); }}
                  disabled={open.isPending}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left active:scale-[0.98] transition-all"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <FileText size={20} className="text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <p className="break-words text-sm font-medium text-foreground">{d.title}</p>
                      {!d.first_opened_at ? <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">Novo</span> : null}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {DELIVERY_KIND_LABEL[d.kind]} · {sentDateBR(d.sent_at)}
                      {d.sender_name ? ` · ${d.sender_name}` : ""}
                      {fileSizeText(d.file_size_bytes) ? ` · ${fileSizeText(d.file_size_bytes)}` : ""}
                    </p>
                  </div>
                  {open.isPending && open.variables?.id === d.id ? <Loader2 size={18} className="animate-spin text-muted-foreground" aria-hidden /> : <Download size={18} className="text-muted-foreground" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      </div>
      <BottomNav />
    </div>
  );
}
