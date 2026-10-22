import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelAccountDeletion, exportMyData, getMyDeletionRequest, requestAccountDeletion } from "@/lib/api";

const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" });

/** Seus dados (LGPD): baixar tudo e pedir a exclusão da conta. A exclusão é feita pela clínica; dá para cancelar o pedido. */
export default function AccountRights() {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const req = useQuery({ queryKey: ["accountDeletion"], queryFn: getMyDeletionRequest });

  const download = useMutation({
    mutationFn: exportMyData,
    onSuccess: (data) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url; a.download = `meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg("Seus dados foram baixados.");
    },
    onError: () => setMsg("Não foi possível baixar seus dados agora. Tente de novo."),
  });
  const ask = useMutation({
    mutationFn: requestAccountDeletion,
    onSuccess: () => { setConfirming(false); setMsg(null); void qc.invalidateQueries({ queryKey: ["accountDeletion"] }); },
    onError: () => { setConfirming(false); setMsg("Não foi possível enviar o pedido. Tente de novo."); },
  });
  const cancel = useMutation({
    mutationFn: cancelAccountDeletion,
    onSuccess: () => { setMsg("Pedido cancelado. Sua conta continua como estava."); void qc.invalidateQueries({ queryKey: ["accountDeletion"] }); },
    onError: () => setMsg("Não foi possível cancelar agora. Tente de novo."),
  });

  const pendingSince = req.data ?? null;
  return (
    <div className="bg-card rounded-2xl p-4 mb-3" data-testid="account-rights">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Seus dados</p>
      <button onClick={() => download.mutate()} disabled={download.isPending} className="w-full flex items-center gap-3 py-2 text-left">
        <Download size={18} className="text-primary" />
        <span className="text-sm text-foreground flex-1">Exportar meus dados</span>
      </button>

      {pendingSince ? (
        <div className="mt-2 rounded-xl bg-muted/50 p-3">
          <p className="text-sm text-foreground">Você pediu para excluir sua conta em {DATE.format(new Date(pendingSince))}. Sua clínica vai concluir o pedido.</p>
          <button onClick={() => cancel.mutate()} disabled={cancel.isPending} className="mt-2 text-sm font-semibold text-primary">Cancelar pedido</button>
        </div>
      ) : confirming ? (
        <div className="mt-2 rounded-xl bg-muted/50 p-3">
          <p className="text-sm text-foreground">Sua clínica será avisada e concluirá a exclusão. Seu nome, e-mail, fotos e documentos serão removidos e o acesso bloqueado. Os registros de peso, refeições e treinos ficam na clínica, sem identificação. Até lá, você pode cancelar.</p>
          <div className="flex gap-4 mt-3">
            <button onClick={() => ask.mutate()} disabled={ask.isPending} className="text-sm font-semibold text-destructive">Pedir exclusão</button>
            <button onClick={() => setConfirming(false)} className="text-sm text-muted-foreground">Voltar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="w-full flex items-center gap-3 py-2 text-left">
          <Trash2 size={18} className="text-destructive" />
          <span className="text-sm text-destructive flex-1">Excluir minha conta</span>
        </button>
      )}
      {msg && <p className="text-[11px] text-muted-foreground mt-2" role="status">{msg}</p>}
    </div>
  );
}
