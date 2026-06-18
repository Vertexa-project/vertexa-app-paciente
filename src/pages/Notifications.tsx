import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Droplets, Dumbbell, Trophy, MessageSquare, Bell, AlertTriangle, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { notifications } from "@/data/mockData";
import { getAdherenceState } from "@/lib/adherenceEngine";
import { tracker } from "@/lib/eventTracker";
import BottomNav from "@/components/BottomNav";

const typeIcons: Record<string, React.ElementType> = {
  reminder: Bell,
  motivation: TrendingUp,
  achievement: Trophy,
  professional: MessageSquare,
  retention: AlertTriangle,
  system: Dumbbell,
};

const typeColors: Record<string, string> = {
  reminder: "bg-primary/10 text-primary",
  motivation: "bg-success/10 text-success",
  achievement: "bg-warning/10 text-warning",
  professional: "bg-primary/10 text-primary",
  retention: "bg-destructive/10 text-destructive",
  system: "bg-muted text-muted-foreground",
};

export default function Notifications() {
  const navigate = useNavigate();
  const state = getAdherenceState();

  useEffect(() => { tracker.track('notification_viewed'); }, []);

  // Combine mock notifications with retention-aware ones
  const retentionNotifs = state.level !== 'alta' ? [
    { id: 100, type: "retention", title: "Sua constância precisa de atenção", message: `Seu VRI está em ${state.score}%. Registre seus hábitos para melhorar.`, time: "Agora", read: false },
  ] : [
    { id: 100, type: "motivation", title: "Adesão excelente! 🔥", message: `Seu VRI está em ${state.score}%. Sua constância está fazendo a diferença.`, time: "Agora", read: false },
  ];

  const allNotifs = [...retentionNotifs, ...notifications];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Notificações</h1>
          <span className="ml-auto text-xs text-primary font-medium">{allNotifs.filter(n => !n.read).length} novas</span>
        </div>

        <div className="flex flex-col gap-2">
          {allNotifs.map((n, i) => {
            const Icon = typeIcons[n.type] || Bell;
            const colorClass = typeColors[n.type] || "bg-muted text-muted-foreground";
            return (
              <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className={`flex items-start gap-3 p-4 rounded-xl ${!n.read ? "bg-card" : "bg-card/50"}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">{n.time}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
