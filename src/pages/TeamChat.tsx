import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Paperclip, Camera, Image as ImageIcon, FileText,
  ChevronRight, Lock, Users, AtSign, X, Check, CheckCheck, Clock,
  Stethoscope, Apple, Dumbbell, ChevronDown, Plus, Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { tracker } from "@/lib/eventTracker";

interface Professional {
  id: string;
  name: string;
  role: string;
  roleLabel: string;
  avatar: string;
  color: string;
  online: boolean;
  isExternal?: boolean;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | string; // 'user' or professional id
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  mentionedProfessional?: string | null; // null = all, id = private
  attachmentType?: 'image' | 'video' | 'document';
  attachmentPreview?: string;
}

const professionals: Professional[] = [
  { id: 'med', name: 'Dra. Juliana', role: 'médico', roleLabel: 'Médica', avatar: 'JC', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', online: true },
  { id: 'nutri', name: 'Gabriel', role: 'nutricionista', roleLabel: 'Nutricionista', avatar: 'GS', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', online: true },
  { id: 'personal', name: 'Rafael', role: 'personal', roleLabel: 'Personal Trainer', avatar: 'RM', color: 'bg-primary/20 text-primary border-primary/30', online: false },
  { id: 'external', name: 'Dr. Marcos', role: 'fisioterapeuta', roleLabel: 'Fisioterapeuta', avatar: 'ML', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', online: false, isExternal: true },
];

const getRoleIcon = (role: string) => {
  if (role === 'médico') return <Stethoscope size={12} />;
  if (role === 'nutricionista') return <Apple size={12} />;
  return <Dumbbell size={12} />;
};

const initialMessages: Message[] = [
  { id: '1', text: 'Bom dia! Como está se sentindo esta semana?', sender: 'med', timestamp: '09:15', status: 'read' },
  { id: '2', text: 'Estou bem, doutora! Mantendo a rotina certinho.', sender: 'user', timestamp: '09:22', status: 'read', mentionedProfessional: null },
  { id: '3', text: 'Ótimo! Seus exames ficaram excelentes. Continue assim.', sender: 'med', timestamp: '09:25', status: 'read' },
  { id: '4', text: 'Gabriel, posso trocar o lanche da tarde por uma fruta com pasta de amendoim?', sender: 'user', timestamp: '10:40', status: 'read', mentionedProfessional: 'nutri' },
  { id: '5', text: 'Pode sim! Boa escolha. Mantenha a porção de 1 colher de sopa da pasta.', sender: 'nutri', timestamp: '10:55', status: 'read' },
  { id: '6', text: 'Rafael, ontem senti um desconforto no ombro durante o supino. É normal?', sender: 'user', timestamp: '14:10', status: 'read', mentionedProfessional: 'personal' },
  { id: '7', text: 'Vamos ajustar a amplitude e a pegada. No treino de hoje, faz com a carga 10% menor e me manda um vídeo pela análise de IA do app.', sender: 'personal', timestamp: '14:30', status: 'read' },
  { id: '8', text: 'Equipe, viajo na semana que vem. Consigo manter a rotina viajando?', sender: 'user', timestamp: '16:05', status: 'delivered', mentionedProfessional: null },
];

const quickSuggestions = [
  'Dúvida sobre dieta',
  'Dúvida sobre treino',
  'Ajustar rotina',
  'Enviar exame',
];

export default function TeamChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [selectedMention, setSelectedMention] = useState<Professional | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showTeamInfo, setShowTeamInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // B2B module flag: external professional only visible when plan includes it
  const [hasExternalModule] = useState(false);

  // Visible professionals based on module status
  const visibleProfessionals = professionals.filter(p => !p.isExternal || hasExternalModule);
  const coreTeam = professionals.filter(p => !p.isExternal);
  const externalTeam = professionals.filter(p => p.isExternal);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    tracker.track('plan_viewed', { context: 'team_chat' });
  }, []);

  const handleInputChange = (val: string) => {
    setInput(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && lastAt === val.length - 1) {
      setShowMentions(true);
    } else if (showMentions && !val.includes('@')) {
      setShowMentions(false);
    }
  };

  const handleMention = (prof: Professional) => {
    setSelectedMention(prof);
    const lastAt = input.lastIndexOf('@');
    setInput(input.substring(0, lastAt) + `@${prof.role} `);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const clearMention = () => {
    setSelectedMention(null);
    setInput(input.replace(/@\w+\s?/, ''));
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      mentionedProfessional: selectedMention?.id || null,
    };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setSelectedMention(null);

    // Simulate response
    setTimeout(() => {
      const responder = selectedMention || professionals[Math.floor(Math.random() * professionals.length)];
      const autoReply: Message = {
        id: (Date.now() + 1).toString(),
        text: getAutoReply(responder.role),
        sender: responder.id,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
      };
      setMessages(prev => [...prev, autoReply]);
    }, 3000);
  };

  const getAutoReply = (role: string) => {
    const replies: Record<string, string[]> = {
      'médico': ['Entendido! Vou avaliar isso. Se persistir, me avise.', 'Ótimo progresso! Continue seguindo as orientações.'],
      'nutricionista': ['Boa pergunta! Vou ajustar seu plano com essa informação.', 'Perfeito, mantém essa substituição que está adequada.'],
      'personal': ['Anotado! Vamos adaptar o treino conforme necessário.', 'Bom relato! Ajusto a carga na sua próxima ficha.'],
    };
    const opts = replies[role] || replies['médico'];
    return opts[Math.floor(Math.random() * opts.length)];
  };

  const handleQuickSuggestion = (text: string) => {
    setInput(text + ' ');
    inputRef.current?.focus();
  };

  const getProfessional = (id: string) => visibleProfessionals.find(p => p.id === id);

  const getStatusIcon = (status: string) => {
    if (status === 'sent') return <Check size={12} className="text-muted-foreground" />;
    if (status === 'delivered') return <CheckCheck size={12} className="text-muted-foreground" />;
    return <CheckCheck size={12} className="text-blue-400" />;
  };

  const getMentionLabel = (mentionId: string | null | undefined) => {
    if (mentionId === undefined) return null;
    if (mentionId === null) return null;
    const prof = getProfessional(mentionId);
    return prof ? prof.roleLabel : null;
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
                {visibleProfessionals.map(p => (
                  <div key={p.id} className={`w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold border ${p.color}`}>
                    {p.avatar}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">Equipe principal</p>
              <p className="text-[10px] text-muted-foreground">
                {visibleProfessionals.filter(p => p.online).length} online · {visibleProfessionals.length} profissionais
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

        {messages.map((msg, i) => {
          const isUser = msg.sender === 'user';
          const prof = !isUser ? getProfessional(msg.sender) : null;
          const mentionLabel = isUser ? getMentionLabel(msg.mentionedProfessional) : null;
          const showSenderHeader = !isUser && (i === 0 || messages[i - 1].sender !== msg.sender);

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                {/* Sender header for professionals */}
                {showSenderHeader && prof && (
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold border ${prof.color}`}>
                      {prof.avatar}
                    </div>
                    <span className="text-[10px] font-medium text-foreground">{prof.name}</span>
                    <span className="text-[10px] text-muted-foreground">· {prof.roleLabel}</span>
                  </div>
                )}

                <div className={`rounded-2xl px-3.5 py-2.5 ${
                  isUser
                    ? mentionLabel
                      ? 'bg-primary/90 text-primary-foreground rounded-br-md border border-primary/50'
                      : 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-card border border-border rounded-bl-md'
                }`}>
                  {/* Private mention indicator */}
                  {mentionLabel && isUser && (
                    <div className="flex items-center gap-1 mb-1 pb-1 border-b border-primary-foreground/20">
                      <AtSign size={10} className="text-primary-foreground/70" />
                      <span className="text-[9px] text-primary-foreground/70 font-medium">
                        Privada para {mentionLabel}
                      </span>
                    </div>
                  )}

                  {/* Attachment preview */}
                  {msg.attachmentType && (
                    <div className="w-full h-32 rounded-lg bg-secondary/50 mb-2 flex items-center justify-center">
                      {msg.attachmentType === 'image' && <ImageIcon size={24} className="text-muted-foreground" />}
                      {msg.attachmentType === 'document' && <FileText size={24} className="text-muted-foreground" />}
                    </div>
                  )}

                  <p className={`text-sm leading-relaxed ${isUser ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {msg.text}
                  </p>

                  <div className={`flex items-center justify-end gap-1 mt-1 ${isUser ? '' : ''}`}>
                    <span className={`text-[9px] ${isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {msg.timestamp}
                    </span>
                    {isUser && getStatusIcon(msg.status)}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions */}
      {messages.length <= 8 && (
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
        {showMentions && (
          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            className="mx-4 mb-1 rounded-xl bg-card border border-border overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[10px] text-muted-foreground font-medium">Direcionar para a equipe:</p>
            </div>
            {visibleProfessionals.map(prof => (
              <button
                key={prof.id}
                onClick={() => handleMention(prof)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border ${prof.color}`}>
                  {prof.avatar}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-foreground font-medium">{prof.name}</p>
                    {prof.isExternal && (
                      <span className="text-[8px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full">Adicional</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{prof.roleLabel}</p>
                </div>
                <div className="text-muted-foreground">{getRoleIcon(prof.role)}</div>
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
            <span className="text-[10px] text-primary font-medium">Privada para {selectedMention.roleLabel}</span>
            <button onClick={clearMention}><X size={12} className="text-primary/60" /></button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border bg-card/95 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0"
          >
            <Paperclip size={18} className="text-muted-foreground" />
          </button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Mensagem para a equipe..."
              className="w-full bg-secondary rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              input.trim() ? 'bg-primary' : 'bg-secondary'
            }`}
          >
            <Send size={16} className={input.trim() ? 'text-primary-foreground' : 'text-muted-foreground'} />
          </button>
        </div>
      </div>

      {/* Attach menu */}
      <AnimatePresence>
        {showAttachMenu && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-card border-t border-border overflow-hidden"
          >
            <div className="flex justify-around py-4 px-6">
              {[
                { icon: Camera, label: 'Câmera', color: 'bg-blue-500/15 text-blue-400' },
                { icon: ImageIcon, label: 'Galeria', color: 'bg-emerald-500/15 text-emerald-400' },
                { icon: FileText, label: 'Documento', color: 'bg-purple-500/15 text-purple-400' },
              ].map(item => (
                <button key={item.label} onClick={() => setShowAttachMenu(false)} className="flex flex-col items-center gap-2">
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
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
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
                  {coreTeam.map(prof => (
                    <div key={prof.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold border ${prof.color}`}>
                        {prof.avatar}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{prof.name}</p>
                        <p className="text-xs text-muted-foreground">{prof.roleLabel}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${prof.online ? 'bg-emerald-400' : 'bg-muted-foreground'}`} />
                        <span className="text-[10px] text-muted-foreground">{prof.online ? 'Online' : 'Offline'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* External professionals section */}
                {hasExternalModule ? (
                  <div className="mt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Plus size={14} className="text-purple-400" />
                      <p className="text-sm font-semibold text-foreground">Profissional adicional</p>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full">Módulo ativo</span>
                    </div>
                    <div className="space-y-3">
                      {externalTeam.map(prof => (
                        <div key={prof.id} className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold border ${prof.color}`}>
                            {prof.avatar}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-foreground">{prof.name}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{prof.roleLabel} · Vinculado ao seu plano</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${prof.online ? 'bg-emerald-400' : 'bg-muted-foreground'}`} />
                            <span className="text-[10px] text-muted-foreground">{prof.online ? 'Online' : 'Offline'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 p-4 rounded-xl border border-dashed border-border/60 bg-muted/20">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Plus size={16} className="text-muted-foreground/50" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-muted-foreground">Profissional adicional</p>
                        <p className="text-[10px] text-muted-foreground/60">Disponível em planos com módulo expandido</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <span className="text-foreground font-medium">Dica:</span> Use <span className="text-primary font-medium">@</span> para direcionar sua mensagem a um profissional específico. Sem marcação, todos da equipe recebem.
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
