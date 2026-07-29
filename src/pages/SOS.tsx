import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Check, Loader2, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { sosCategories } from "@/data/mockData";
import { getAdherenceState } from "@/lib/adherenceEngine";
import { getMyChannel, sendPatientMessage } from "@/lib/api";
import { buildSosMessageBody } from "@/lib/sosMessage";
import { tracker } from "@/lib/eventTracker";
import BottomNav from "@/components/BottomNav";

/**
 * PRECISO DE AJUDA — agora o texto dela CHEGA A UM HUMANO (WP-APP-7 item 2.1).
 *
 * O QUE ESTA TELA FAZIA: o textarea era controlado, a paciente escrevia de verdade, e o
 * handler fazia `tracker.track('help_requested', { category, hasMessage: message.length > 0 })`
 * — o que ela escreveu virava um BOOLEANO e era descartado. Em seguida a tela afirmava
 * "Sua equipe de acompanhamento foi notificada e retornará em breve". Falso em três camadas:
 * não havia mensagem, não havia notificação (0 linhas em `notifications` em toda a base, e
 * nenhum trigger que emita alguma), e não havia ninguém para retornar.
 *
 * O CAMINHO REAL, verificado antes de escrever uma linha:
 *  · Canal: 7 de 7 pacientes de produção têm `chat_channels` e estão em `chat_participants`.
 *  · Escrita: `chat_messages_insert` exige `is_channel_participant(channel_id)` e
 *    `sender_profile_id = current_profile_id()` — a paciente satisfaz. E não é dedução:
 *    em 28/07 uma paciente escreveu no canal dela e o profissional respondeu 28s depois.
 *  · Envio: `sendPatientMessage` serve SEM ADAPTAÇÃO — `channelId` é o único obrigatório,
 *    menção e anexo são opcionais, corpo vazio já é validado, e não há limite de tamanho.
 *  · NENHUMA migration, policy ou RPC nova. Nada foi tocado no banco.
 *
 * NÃO MENCIONA NINGUÉM automaticamente, de propósito: não existe no dado o conceito de
 * "profissional responsável" (nem em `professional_patient_links`, nem em `patients`). Eleger
 * um seria inventar. Sem menção a mensagem chega à equipe inteira do canal de qualquer forma
 * — é o que a própria tela do chat diz ("direcionar não deixa a conversa privada").
 */
export default function SOS() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const state = getAdherenceState();

  // MESMA query key do TeamChat -> cache compartilhado, nenhuma leitura a mais quando ela
  // vem do chat. `getMyChannel` NÃO cria canal (quem cria é o profissional, ao abrir a
  // conversa no painel), então "sem canal" é um estado real e precisa de tratamento honesto.
  const channelQuery = useQuery({ queryKey: ["myChannel"], queryFn: getMyChannel });
  const channelId = channelQuery.data?.id ?? null;
  const noChannel = !channelQuery.isPending && !channelQuery.isError && !channelId;

  const selectedCategory = sosCategories.find((c) => c.id === selected) ?? null;

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!channelId || !selectedCategory) throw new Error("sem canal ou categoria");
      return sendPatientMessage({
        channelId,
        body: buildSosMessageBody({ categoryLabel: selectedCategory.label, message }),
      });
    },
  });

  const handleSend = () => {
    if (!selected || !channelId || sendMutation.isPending) return;
    // ⚠️ NÃO MEXER, e o motivo não é preguiça: `help_requested` está na allow-list do
    // eventSync, então esta chamada grava em `activity_events` e dispara
    // `recompute_adherence`. Mover, remover ou condicionar isto MUDA O CÁLCULO DE ADESÃO —
    // área explicitamente vedada neste WP. Fica exatamente onde estava, com o mesmo payload
    // e a mesma guarda de `selected`, disparando na TENTATIVA (é o gesto dela que o evento
    // registra, não a entrega). O `hasMessage` continua sendo o que o evento carrega; o
    // texto de verdade agora vai para a conversa, que é onde um humano lê.
    tracker.track('help_requested', { category: selected, hasMessage: message.length > 0 });
    sendMutation.mutate();
  };

  const sent = sendMutation.isSuccess;
  const canSend = !!selected && !!channelId && !sendMutation.isPending;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Preciso de ajuda</h1>
        </div>

        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* ANTES: "Sua equipe será notificada." — notificação não existe no produto.
                  Agora a frase diz o que de fato acontece, e é verificável na tela do chat. */}
              <p className="text-sm text-muted-foreground mb-2">
                Selecione o que melhor descreve sua situação. Sua mensagem vai para a conversa
                com sua equipe.
              </p>

              {state.level !== 'alta' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4">
                  <p className="text-xs text-primary font-medium">💡 Percebemos uma queda na sua adesão. Pedir ajuda é o primeiro passo para retomar sua rotina.</p>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-5">
                {sosCategories.map((c) => (
                  <button key={c.id} onClick={() => setSelected(c.id)}
                    className={`flex flex-col items-start gap-2 p-4 rounded-xl transition-all text-left ${
                      selected === c.id ? "gradient-orange shadow-orange" : "bg-card"
                    }`}
                  >
                    <span className="text-2xl">{c.icon}</span>
                    <span className={`text-sm font-medium ${selected === c.id ? "text-primary-foreground" : "text-foreground"}`}>{c.label}</span>
                    <span className={`text-[10px] ${selected === c.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{c.description}</span>
                  </button>
                ))}
              </div>

              <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Conte mais sobre sua situação (opcional)</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Descreva o que está acontecendo..."
                  className="w-full h-24 bg-muted rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
                {/* "ANEXAR FOTO" REMOVIDO (WP-APP-7 item 2.1): era <button> sem onClick — não
                    abria seletor, não subia nada, não guardava nada. O anexo REAL existe na
                    conversa da equipe, que tem upload validado e RLS de storage. Aqui era só
                    a promessa. */}
              </div>

              {/* SEM CANAL: não há por onde a mensagem sair. NÃO fingimos sucesso — a tela diz
                  que não dá para enviar agora e o que fazer. Mesma redação do estado noChannel
                  do TeamChat, para as duas telas não divergirem na mesma frase. */}
              {noChannel && (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 mb-4">
                  <p className="text-sm font-medium text-muted-foreground">Não é possível enviar agora</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">
                    Sua conversa com a equipe ainda não está ativa, e é por ela que sua mensagem
                    chega. Fale com sua clínica para ativar o chat.
                  </p>
                </div>
              )}

              {channelQuery.isError && (
                <div className="rounded-xl border border-dashed border-red-500/30 p-4 mb-4 flex flex-col items-center gap-2 text-center">
                  <p className="text-xs text-red-400">Não foi possível verificar sua conversa com a equipe.</p>
                  <button onClick={() => channelQuery.refetch()} className="text-[11px] font-semibold text-primary">
                    Tentar novamente
                  </button>
                </div>
              )}

              {/* FALHA NO ENVIO: a tela de sucesso SUBSTITUI o formulário inteiro, então um
                  sucesso incondicional apagaria o que ela escreveu. Aqui o erro fica visível,
                  o texto dela permanece no campo, e o botão continua disponível para reenviar. */}
              {sendMutation.isError && (
                <div className="rounded-xl border border-dashed border-red-500/30 p-4 mb-4">
                  <p className="text-xs text-red-400 font-medium">Não foi possível enviar sua mensagem.</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    Ela não chegou à sua equipe. Seu texto continua aqui — você pode tentar de novo.
                  </p>
                </div>
              )}

              <button onClick={handleSend} disabled={!canSend}
                className={`w-full h-14 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all ${
                  canSend ? "gradient-orange text-primary-foreground shadow-orange active:scale-[0.98]" : "bg-muted text-muted-foreground"
                }`}
              >
                {sendMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {sendMutation.isPending ? "Enviando..." : "Enviar para minha equipe"}
              </button>
            </motion.div>
          ) : (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center pt-20 gap-4"
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
                <Check size={36} className="text-success" />
              </motion.div>
              {/* SÓ APARECE DEPOIS QUE O INSERT RESOLVEU (sendMutation.isSuccess). E não afirma
                  notificação, nem prazo, nem análise: diz onde a mensagem está — o único fato
                  que o app consegue provar. A paciente pode conferir, e é por isso que há um
                  caminho direto para a conversa. */}
              <h2 className="text-xl font-display font-bold text-foreground">Mensagem enviada</h2>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Ela está na sua conversa com a equipe, com o texto que você escreveu.
              </p>
              <button onClick={() => navigate("/team-chat")}
                className="mt-2 px-6 py-3 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm shadow-orange flex items-center gap-2">
                <MessageCircle size={16} />
                Abrir a conversa
              </button>
              <button onClick={() => navigate("/home")} className="text-sm text-muted-foreground font-medium">
                Voltar para a Home
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
