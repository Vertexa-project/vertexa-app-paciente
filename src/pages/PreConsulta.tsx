import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import BottomNav from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMyPreConsulta, getMyPreConsultaFiles, removePreConsultaFile, savePreConsultaDraft, submitPreConsulta, uploadPreConsultaFile,
} from "@/lib/api/preConsulta";
import { captureException } from "@/lib/observability/sentry";
import { cardTitle, dayMonthBR, examFileProblem, MAX_ANSWER_CHARS, type PreConsultaRow } from "@/lib/preConsulta";

const field = "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

function Form({ row }: { row: PreConsultaRow }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>(row.answers ?? {});
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const files = useQuery({ queryKey: ["myPreConsultaFiles", row.id], queryFn: () => getMyPreConsultaFiles(row.id) });
  const sentFiles = files.data ?? [];
  const done = row.status === "respondida";

  const refresh = () => { qc.invalidateQueries({ queryKey: ["myPreConsulta"] }); qc.invalidateQueries({ queryKey: ["myPreConsultaFiles", row.id] }); };
  const fail = (scope: string, text: string) => (e: unknown) => { captureException(e, { source: "pre-consulta", scope }); setMessage({ kind: "error", text }); };

  const draft = useMutation({
    mutationFn: () => savePreConsultaDraft(row.id, answers),
    onSuccess: () => { setMessage({ kind: "ok", text: "Rascunho salvo. Você pode continuar depois." }); refresh(); },
    onError: fail("draft", "Não foi possível salvar o rascunho. Tente novamente."),
  });
  const submit = useMutation({
    mutationFn: () => submitPreConsulta(row.id, answers),
    onSuccess: () => { setMessage({ kind: "ok", text: "Pré-consulta enviada! A equipe já pode ver suas respostas." }); refresh(); },
    onError: fail("submit", "Não foi possível enviar. Responda ao menos uma pergunta ou anexe um exame e tente de novo."),
  });
  const upload = useMutation({
    mutationFn: async (list: File[]) => {
      let count = sentFiles.length;
      for (const f of list) {
        const problem = examFileProblem(f, count);
        if (problem) throw new Error(problem);
        await uploadPreConsultaFile(row.id, f);
        count += 1;
        refresh();
      }
    },
    onSuccess: () => setMessage({ kind: "ok", text: "Exame anexado." }),
    onError: (e) => {
      const known = e instanceof Error && /PDF|MB|arquivos|vazio/.test(e.message);
      if (!known) captureException(e, { source: "storage", scope: "pre-consulta-upload" });
      setMessage({ kind: "error", text: known ? (e as Error).message : "Não foi possível enviar o arquivo. Tente novamente." });
    },
    onSettled: () => { if (fileInput.current) fileInput.current.value = ""; },
  });
  const remove = useMutation({
    mutationFn: (id: string) => removePreConsultaFile(id),
    onSuccess: () => refresh(),
    onError: fail("remove", "Não foi possível remover o arquivo."),
  });

  const busy = draft.isPending || submit.isPending || upload.isPending || remove.isPending;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {done ? `Você enviou em ${dayMonthBR(row.answered_at)}. Obrigado!` : "Responda o que souber, no seu tempo. Pode salvar e continuar depois. Suas respostas só são vistas pela equipe que cuida de você."}
      </p>

      <ol className="space-y-4">
        {row.questions.map((q, i) => (
          <li key={q.id}>
            <label htmlFor={`q-${q.id}`} className="mb-1.5 block text-sm font-medium text-foreground">{i + 1}. {q.label}</label>
            {done ? (
              <p className="whitespace-pre-wrap break-words rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground">{(answers[q.id] ?? "").trim() || "—"}</p>
            ) : q.type === "short" ? (
              <input id={`q-${q.id}`} className={field} value={answers[q.id] ?? ""} maxLength={MAX_ANSWER_CHARS} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
            ) : (
              <textarea id={`q-${q.id}`} rows={3} className={field} value={answers[q.id] ?? ""} maxLength={MAX_ANSWER_CHARS} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
            )}
          </li>
        ))}
      </ol>

      <section aria-label="Exames">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Seus exames</h2>
        <p className="mb-2 text-xs text-muted-foreground">Anexe PDF ou foto dos exames recentes (até 15 MB cada).</p>
        {files.isPending ? <Skeleton className="h-10 w-full rounded-xl" /> : sentFiles.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum exame anexado.</p>
        ) : (
          <ul className="space-y-2">
            {sentFiles.map((f) => (
              <li key={f.document_id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5">
                <FileText size={18} className="shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1 break-all text-sm text-foreground">{f.title ?? "Exame"}</span>
                {!done ? (
                  <button type="button" aria-label={`Remover ${f.title ?? "exame"}`} disabled={busy} onClick={() => { setMessage(null); remove.mutate(f.document_id); }} className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground">
                    <Trash2 size={16} aria-hidden />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {!done ? (
          <>
            <input ref={fileInput} type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" aria-label="Escolher exames" onChange={(e) => { const list = Array.from(e.target.files ?? []); if (list.length) { setMessage(null); upload.mutate(list); } }} />
            <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="mt-3 flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-primary/50 px-4 text-sm font-medium text-primary-ink">
              {upload.isPending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Paperclip size={16} aria-hidden />}
              Anexar exame
            </button>
          </>
        ) : null}
      </section>

      {message ? <p role={message.kind === "error" ? "alert" : "status"} className={`text-sm ${message.kind === "error" ? "text-destructive" : "text-foreground"}`}>{message.text}</p> : null}

      {!done ? (
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={() => { setMessage(null); draft.mutate(); }} className="min-h-11 flex-1 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground disabled:opacity-60">
            {draft.isPending ? "Salvando…" : "Salvar rascunho"}
          </button>
          <button type="button" disabled={busy} onClick={() => { setMessage(null); submit.mutate(); }} className="min-h-11 flex-1 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {submit.isPending ? "Enviando…" : "Enviar pré-consulta"}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => navigate("/home")} className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Voltar ao início</button>
      )}
    </div>
  );
}

/** Responder a pré-consulta: ficha curta + exames. Salva rascunho, envia e fica só leitura depois. */
export default function PreConsulta() {
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["myPreConsulta"], queryFn: getMyPreConsulta });
  const row = q.data && q.data.status !== "cancelada" ? q.data : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} aria-label="Voltar" className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">{row ? cardTitle(dayMonthBR(row.appointment_starts_at)) : "Pré-consulta"}</h1>
        </div>
        {q.isPending ? (
          <div className="space-y-3" role="status" aria-label="Carregando"><Skeleton className="h-20 w-full rounded-xl" /><Skeleton className="h-20 w-full rounded-xl" /></div>
        ) : q.isError ? (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Não foi possível carregar.{" "}
            <button type="button" className="text-primary font-medium" onClick={() => q.refetch()}>Tentar de novo</button>
          </div>
        ) : !row ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <CheckCircle2 size={28} className="mx-auto mb-2 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">Nenhuma pré-consulta para responder</p>
            <p className="mt-1 text-xs text-muted-foreground">Quando a clínica pedir antes de uma consulta, ela aparece no Início.</p>
          </div>
        ) : (
          <Form key={row.id} row={row} />
        )}
      </div>
      <BottomNav />
    </div>
  );
}
