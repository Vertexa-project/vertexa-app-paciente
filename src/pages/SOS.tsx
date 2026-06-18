import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Check, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { sosCategories } from "@/data/mockData";
import { getAdherenceState } from "@/lib/adherenceEngine";
import { tracker } from "@/lib/eventTracker";
import BottomNav from "@/components/BottomNav";

export default function SOS() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const state = getAdherenceState();

  const handleSend = () => {
    if (!selected) return;
    tracker.track('help_requested', { category: selected, hasMessage: message.length > 0 });
    setSent(true);
  };

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
              <p className="text-sm text-muted-foreground mb-2">Selecione o que melhor descreve sua situação. Sua equipe será notificada.</p>
              
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
                <button className="mt-2 flex items-center gap-2 text-xs text-primary font-medium">
                  <Camera size={14} /> Anexar foto
                </button>
              </div>

              <button onClick={handleSend} disabled={!selected}
                className={`w-full h-14 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all ${
                  selected ? "gradient-orange text-primary-foreground shadow-orange active:scale-[0.98]" : "bg-muted text-muted-foreground"
                }`}
              >
                <Send size={18} />
                Enviar solicitação
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
              <h2 className="text-xl font-display font-bold text-foreground">Solicitação enviada!</h2>
              <p className="text-sm text-muted-foreground max-w-[260px]">Sua equipe de acompanhamento foi notificada e retornará em breve.</p>
              <div className="bg-card rounded-xl p-3 mt-2">
                <p className="text-[10px] text-muted-foreground">📋 Sua solicitação foi registrada como evento e será analisada pela equipe clínica.</p>
              </div>
              <button onClick={() => navigate("/home")} className="mt-4 px-6 py-3 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm shadow-orange">
                Voltar para Home
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
