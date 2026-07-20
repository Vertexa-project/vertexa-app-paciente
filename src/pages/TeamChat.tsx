import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Paperclip, Camera, Image as ImageIcon, FileText,
  Lock, Users, AtSign, X, Check, Stethoscope, Apple, Dumbbell, Activity,
  Shield, Loader2, AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tracker } from "@/lib/eventTracker";
import {
  getMyChannel,
  listChannelProfessionals,
  sendPatientMessage,
} from "@/lib/api";
import type { ChannelProfessional, ProfessionalType } from "@/lib/api";
import { CHAT_ATTACHMENT_MIME, validateChatAttachment } from "@/lib/api/chatAttachment";
import { captureException } from "@/lib/observability/sentry";
import { ChatAttachmentView } from "@/components/ChatAttachmentView";
import { useChannelMessages } from "@/hooks/useChannelMessages";

const TYPE_STYLES: Record<string, string> = {
  doctor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  nutritionist: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  personal_trainer: "bg-primary/20 text-primary border-primary/30",
  physiotherapist: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  other: "bg-secondary text-muted-foreground border-border",
};

const TITLE_RE = /^(dra?\.?|prof\.?|sr\.?|sra\.?)\s+/i;

function typeColor(type: ProfessionalType | null): string {
  return TYPE_STYLES[type ?? "other"] ?? TYPE_STYLES.other;
}

function getInitials(name: string): string {
  const parts = name.replace(TITLE_RE, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function shortName(name: string): string {
  const parts = name.replace(TITLE_RE, "").trim().split(/\s+/);
  return parts[0] || name;
}

function getRoleIcon(type: ProfessionalType | null) {
  if (type === "doctor") return <Stethoscope size={12} />;
  if (type === "nutritionist") return <Apple size={12} />;
  if (type === "physiotherapist") return <Activity size={12} />;
  return <Dumbbell size={12} />;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const quickSuggestions = [
  "Dúvida sobre dieta",
  "Dúvida sobre treino",
  "Ajustar rotina",
  "Enviar exame",
];

export default function TeamChat() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [selectedMention, setSelectedMention] = useState<ChannelProfessional | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showTeamInfo, setShowTeamInfo] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Preserve existing analytics event for this screen.
  useEffect(() => {
    tracker.track("plan_viewed", { context: "team_chat" });
  }, []);

  const channelQuery = useQuery({ queryKey: ["myChannel"], queryFn: getMyChannel });
  const channelId = channelQuery.data?.id;

  const professionalsQuery = useQuery({
    queryKey: ["channelProfessionals", channelId],
    queryFn: () => listChannelProfessionals(channelId as string),
    enabled: !!channelId,
  });
  const professionals = professionalsQuery.data ?? [];

  const messagesQuery = useChannelMessages(channelId);
  const messages = messagesQuery.data ?? [];

  const sendMutation = useMutation({
    mutationFn: sendPatientMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channelMessages", channelId] });
    },
    onError: (_err, vars) => {
      // Só reporta o fluxo de ANEXO. Erro SANITIZADO (sem nome de arquivo/caminho = sem PII).
      if (vars.file) {
        captureException(new Error("chat attachment send failed"), {
          source: "chat-attachment",
          scope: "send",
        });
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (val: string) => {
    setInput(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt !== -1 && lastAt === val.length - 1 && professionals.length > 0) {
      setShowMentions(true);
    } else if (showMentions && !val.includes("@")) {
      setShowMentions(false);
    }
  };

  const handleMention = (prof: ChannelProfessional) => {
    setSelectedMention(prof);
    const lastAt = input.lastIndexOf("@");
    const base = lastAt === -1 ? input : input.substring(0, lastAt);
    setInput(base + `@${shortName(prof.name)} `);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const clearMention = () => {
    setSelectedMention(null);
    setInput(input.replace(/@\S+\s?/, ""));
  };

  const handleSend = () => {
    const body = input.trim();
    if ((!body && !file) || !channelId || sendMutation.isPending) return;
    sendMutation.mutate(
      {
        channelId,
        body: body || null,
        mentionedProfileId: selectedMention?.profileId ?? null,
        file,
      },
      {
        onSuccess: () => {
          setInput("");
          setSelectedMention(null);
          setShowMentions(false);
          setFile(null);
          setAttachError(null);
        },
      },
    );
  };

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = ""; // permite re-selecionar o mesmo arquivo
    setShowAttachMenu(false);
    if (!picked) return;
    const invalid = validateChatAttachment(picked); // valida tipo/tamanho ANTES do upload
    if (invalid) {
      setAttachError(invalid);
      setFile(null);
      return;
    }
    setAttachError(null);
    setFile(picked);
  };

  const handleQuickSuggestion = (text: string) => {
    setInput(text + " ");
    inputRef.current?.focus();
  };

  const isLoading =
    channelQuery.isLoading || (!!channelId && messagesQuery.isLoading);
  const isError = channelQuery.isError || messagesQuery.isError;
  const noChannel = !channelQuery.isLoading && !channelQuery.data;

  const retry = () => {
    channelQuery.refetch();
    if (channelId) messagesQuery.refetch();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <div className="bg-card/95 backdrop-blur-xl border-b border-border z-10">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft size={22} className="text-foreground" />
          </button>
          <button onClick={() => setShowTeamInfo(true)} className="flex items-center gap-3 flex-1">
            <div className="relative">
              <div className="flex -space-x-2">
                {professionals.map(p => (
                  <div key={p.profileId} className={`w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold border ${typeColor(p.type)}`}>
                    {getInitials(p.name)}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">Equipe principal</p>
              <p className="text-[10px] text-muted-foreground">
                {professionals.length} profissionais
              </p>
            </div>
          </button>
          <button onClick={() => setShowTeamInfo(true)}>
            <Users size={20} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-2">
        {/* Intro card */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border">
            <Lock size={10} className="text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Canal seguro de acompanhamento</span>
          </div>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={28} className="text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Carregando conversa...</p>
          </div>
        )}

        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <AlertCircle size={28} className="text-destructive" />
            <p className="text-sm text-foreground">Não foi possível carregar a conversa.</p>
            <button onClick={retry} className="mt-1 px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-medium">
              Tentar novamente
            </button>
          </div>
        )}

        {noChannel && !isLoading && !isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
            <p className="text-sm text-foreground">Canal de acompanhamento não encontrado.</p>
            <p className="text-xs text-muted-foreground">Fale com sua clínica para ativar o chat.</p>
          </div>
        )}

        {!isLoading && !isError && !noChannel && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
            <p className="text-sm text-foreground">Ainda não há mensagens.</p>
            <p className="text-xs text-muted-foreground">Envie a primeira mensagem para sua equipe.</p>
          </div>
        )}

        {!isLoading && !isError && messages.map((msg, i) => {
          const isUser = msg.isOwn;
          const showSenderHeader =
            !isUser && (i === 0 || messages[i - 1].senderProfileId !== msg.senderProfileId);

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
                {showSenderHeader && (
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold border ${typeColor(msg.type)}`}>
                      {getInitials(msg.displayName)}
                    </div>
                    <span className="text-[10px] font-medium text-foreground">{msg.displayName}</span>
                    {msg.specialty && (
                      <span className="text-[10px] text-muted-foreground">· {msg.specialty}</span>
                    )}
                  </div>
                )}

                <div className={`rounded-2xl px-3.5 py-2.5 ${
                  isUser
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border rounded-bl-md"
                }`}>
                  {/* body é ANULÁVEL: mensagem só-anexo não tem texto. */}
                  {msg.body ? (
                    <p className={`text-sm leading-relaxed ${isUser ? "text-primary-foreground" : "text-foreground"}`}>
                      {msg.body}
                    </p>
                  ) : null}
                  {msg.attachmentPath ? (
                    <div className={msg.body ? "mt-2" : ""}>
                      <ChatAttachmentView
                        path={msg.attachmentPath}
                        name={msg.attachmentName}
                        mime={msg.attachmentMime}
                        size={msg.attachmentSize}
                        isOwn={isUser}
                      />
                    </div>
                  ) : null}

                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className={`text-[9px] ${isUser ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {formatTime(msg.createdAt)}
                    </span>
                    {isUser && <Check size={12} className="text-primary-foreground/70" />}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions */}
      {!isLoading && !isError && !noChannel && messages.length <= 8 && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickSuggestions.map(s => (
              <button
                key={s}
                onClick={() => handleQuickSuggestion(s)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-card border border-border text-[11px] text-foreground font-medium hover:border-primary/30 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mention selector */}
      <AnimatePresence>
        {showMentions && professionals.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            className="mx-4 mb-1 rounded-xl bg-card border border-border overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[10px] text-muted-foreground font-medium">Direcionar para a equipe:</p>
            </div>
            {professionals.map(prof => (
              <button
                key={prof.profileId}
                onClick={() => handleMention(prof)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border ${typeColor(prof.type)}`}>
                  {getInitials(prof.name)}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm text-foreground font-medium">{prof.name}</p>
                  {prof.specialty && <p className="text-[10px] text-muted-foreground">{prof.specialty}</p>}
                </div>
                <div className="text-muted-foreground">{getRoleIcon(prof.type)}</div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected mention badge */}
      {selectedMention && (
        <div className="px-4 pb-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/20">
            <AtSign size={10} className="text-primary" />
            <span className="text-[10px] text-primary font-medium">Direcionado a {selectedMention.name}</span>
            <button onClick={clearMention}><X size={12} className="text-primary/60" /></button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border bg-card/95 backdrop-blur-xl">
        {/* Anexo selecionado (chip com remover) */}
        {file && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-2.5 py-1.5">
            <Paperclip size={13} className="text-muted-foreground flex-shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">{file.name}</span>
            <button onClick={() => setFile(null)} disabled={sendMutation.isPending} aria-label="Remover anexo">
              <X size={13} className="text-muted-foreground" />
            </button>
          </div>
        )}
        {attachError && (
          <p className="mb-2 text-[11px] text-destructive" role="alert">{attachError}</p>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            disabled={!channelId || sendMutation.isPending}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 disabled:opacity-50"
            aria-label="Anexar arquivo"
          >
            <Paperclip size={18} className="text-muted-foreground" />
          </button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Mensagem para a equipe..."
              disabled={!channelId}
              className="w-full bg-secondary rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !file) || !channelId || sendMutation.isPending}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              (input.trim() || file) && channelId && !sendMutation.isPending ? "bg-primary" : "bg-secondary"
            }`}
          >
            {sendMutation.isPending
              ? <Loader2 size={16} className="text-muted-foreground animate-spin" />
              : <Send size={16} className={(input.trim() || file) && channelId ? "text-primary-foreground" : "text-muted-foreground"} />}
          </button>
        </div>
      </div>

      {/* Inputs de arquivo (ocultos) — upload REAL (WP-CHAT-ATTACH B). Câmera/Galeria → imagem; Documento → PDF. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handlePickFile}
        aria-hidden
        tabIndex={-1}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handlePickFile}
        aria-hidden
        tabIndex={-1}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handlePickFile}
        aria-hidden
        tabIndex={-1}
      />

      {/* Attach menu — upload REAL (substitui o menu cosmético) */}
      <AnimatePresence>
        {showAttachMenu && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-card border-t border-border overflow-hidden"
          >
            <div className="flex justify-around py-4 px-6">
              {[
                { icon: Camera, label: "Câmera", color: "bg-blue-500/15 text-blue-400", ref: cameraInputRef },
                { icon: ImageIcon, label: "Galeria", color: "bg-emerald-500/15 text-emerald-400", ref: galleryInputRef },
                { icon: FileText, label: "Documento", color: "bg-purple-500/15 text-purple-400", ref: documentInputRef },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => item.ref.current?.click()}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.color}`}>
                    <item.icon size={22} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team info sheet */}
      <AnimatePresence>
        {showTeamInfo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTeamInfo(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-card rounded-t-3xl border-t border-border"
            >
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3" />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={16} className="text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Equipe principal</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-5">Profissionais vinculados ao seu acompanhamento</p>

                <div className="space-y-3">
                  {professionals.map(prof => (
                    <div key={prof.profileId} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold border ${typeColor(prof.type)}`}>
                        {getInitials(prof.name)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{prof.name}</p>
                        {prof.specialty && <p className="text-xs text-muted-foreground">{prof.specialty}</p>}
                      </div>
                      <div className="text-muted-foreground">{getRoleIcon(prof.type)}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <span className="text-foreground font-medium">Dica:</span> Use <span className="text-primary font-medium">@</span> para direcionar sua mensagem a um profissional específico. Todos da equipe veem o canal.
                  </p>
                </div>

                <button
                  onClick={() => setShowTeamInfo(false)}
                  className="w-full mt-4 py-3 rounded-xl bg-secondary text-foreground text-sm font-medium"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}