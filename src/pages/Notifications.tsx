import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { tracker } from "@/lib/eventTracker";
import BottomNav from "@/components/BottomNav";
import NotificationsList from "@/components/NotificationsList";

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, isError, markRead, markAllRead } = useNotifications();

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
        <NotificationsList notifications={notifications} isLoading={isLoading} isError={isError} markRead={markRead} />
      </div>
      <BottomNav />
    </div>
  );
}
