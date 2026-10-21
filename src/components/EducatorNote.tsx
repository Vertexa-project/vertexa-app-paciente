import { useState } from "react";
import { MessageSquare, Loader2, Check } from "lucide-react";
import { getMyChannel, listChannelProfessionals, sendPatientMessage } from "@/lib/api";
import { buildNoteBody, canSendNote, findEducator, NOTE_MAX } from "@/lib/educatorNote";

type Status = "idle" | "open" | "sending" | "sent" | "error" | "noChannel";

/** "Deixar recado para o educador" (tela 23). Vira uma mensagem no canal seguro, marcando o educador se houver. */
export default function EducatorNote({ workoutLabel }: { workoutLabel: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [text, setText] = useState("");

  const send = async () => {
    if (!canSendNote(text)) return;
    setStatus("sending");
    try {
      const channel = await getMyChannel();
      if (!channel) { setStatus("noChannel"); return; }
      const roster = await listChannelProfessionals(channel.id, false);
      await sendPatientMessage({ channelId: channel.id, body: buildNoteBody(workoutLabel, text), mentionedProfileId: findEducator(roster) });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return <p className="mb-4 text-[12px] text-primary font-medium flex items-center justify-center gap-1.5"><Check size={14} /> Recado enviado à sua equipe.</p>;
  }
  if (status === "idle") {
    return (
      <button onClick={() => setStatus("open")} className="w-full mb-4 h-12 rounded-2xl bg-card border border-border text-sm font-medium text-foreground flex items-center justify-center gap-2">
        <MessageSquare size={16} /> Deixar recado para o educador
      </button>
    );
  }
  return (
    <div className="mb-4 bg-card rounded-2xl p-4 text-left" data-testid="educator-note">
      <label htmlFor="educator-note-text" className="text-sm font-semibold text-foreground">Recado para o educador</label>
      <textarea
        id="educator-note-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={NOTE_MAX} rows={3}
        placeholder="Ex.: senti o ombro na terceira série"
        className="mt-2 w-full rounded-xl bg-muted p-3 text-sm text-foreground focus:outline-none resize-none"
      />
      {status === "error" && <p role="alert" className="mt-1 text-[11px] text-red-400">Não foi possível enviar. Tente de novo.</p>}
      {status === "noChannel" && <p role="alert" className="mt-1 text-[11px] text-red-400">O chat com a equipe ainda não está ativo. Fale com a sua clínica.</p>}
      <button onClick={send} disabled={!canSendNote(text) || status === "sending"}
        className="mt-2 w-full h-11 rounded-xl gradient-orange text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
        {status === "sending" && <Loader2 size={14} className="animate-spin" />} Enviar recado
      </button>
    </div>
  );
}
