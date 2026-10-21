import { useEffect } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useNotifications } from "@/hooks/useNotifications";
import { tracker } from "@/lib/eventTracker";
import NotificationsList from "@/components/NotificationsList";

// PDF do Ernâni (tela 02): o sino abre um painel sobre a Home, não outra tela.
function PanelBody() {
  const { notifications, unreadCount, isLoading, isError, markRead, markAllRead } = useNotifications();
  useEffect(() => { tracker.track("notification_viewed"); }, []);
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <SheetTitle className="font-display text-lg text-foreground">Notificações</SheetTitle>
        {unreadCount > 0 && (
          <button onClick={() => markAllRead()} className="ml-auto text-xs text-primary font-semibold">
            Marcar lidas
          </button>
        )}
      </div>
      <SheetDescription className="sr-only">Avisos da sua clínica e da sua equipe</SheetDescription>
      <div className="max-h-[60vh] overflow-y-auto pb-2">
        <NotificationsList notifications={notifications} isLoading={isLoading} isError={isError} markRead={markRead} />
      </div>
    </>
  );
}

export default function NotificationsPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-card border-border rounded-t-3xl max-w-[430px] mx-auto pb-8">
        <PanelBody />
      </SheetContent>
    </Sheet>
  );
}
