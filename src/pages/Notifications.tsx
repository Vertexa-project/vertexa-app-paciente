import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Droplets, Dumbbell, Trophy, MessageSquare, Bell, AlertTriangle, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { daysAgoLocal } from "@/lib/pendingLogic";
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

// "Hoje" / "Ontem" / "Nd" / "dd/mm" a partir do created_at (fuso local).
function timeLabel(iso: string, now: Date): string {
  const d = daysAgoLocal(iso, now);
  if (d === 0) return "Hoje";
  if (d === 1) return "Ontem";
  if (d <= 6) return `${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, isError, markRead, markAllRead } = useNotifications();
  const now = new Date();

  useEffect(() => { tracker.track('notification_viewed'); }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Notificações</h1>
          {unreadCount > 0 && (
            <button onClick={() => markAllRead()} className="ml-auto text-xs text-primary font-medium">
              {unreadCount} novas · marcar todas
            </button>
          )}
        </div>

        {isError ? (
          <p className="text-xs text-red-400 text-center py-8">Não foi possível carregar suas notificações.</p>
        ) : isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-border flex flex-col items-center gap-2 text-center mt-4">
            <Bell size={22} className="text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação por aqui</p>
            <p className="text-[11px] text-muted-foreground">Você está em dia! 🎉</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n, i) => {
              const Icon = typeIcons[n.type] || Bell;
              const colorClass = typeColors[n.type] || "bg-muted text-muted-foreground";
              const unread = !n.read_at;
              return (
                <motion.button
                  key={n.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => unread && markRead(n.id)}
                  className={`w-full text-left flex items-start gap-3 p-4 rounded-xl ${unread ? "bg-card" : "bg-card/50"} ${unread ? "active:scale-[0.99] transition-transform" : ""}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${unread ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                      {unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                    <span className="text-[10px] text-muted-foreground mt-1 block">{timeLabel(n.created_at, now)}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
