import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const VISIBLE_ROUTES = ["/home", "/plan", "/habits", "/progress", "/journey", "/workout-guide", "/records", "/challenges", "/achievements"];
const HIDDEN_ROUTES = ["/", "/onboarding", "/login", "/team-chat", "/sos"];

const contextLabels: Record<string, string> = {
  "/workout-guide": "Dúvida no treino?",
  "/plan": "Falar com nutricionista",
  "/habits": "Falar com equipe",
  "/progress": "Tirar dúvida",
};

export default function FloatingChatButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLabel, setShowLabel] = useState(false);
  const [unreadCount] = useState(2);

  const isVisible = VISIBLE_ROUTES.some(r => location.pathname.startsWith(r)) && !HIDDEN_ROUTES.includes(location.pathname);

  useEffect(() => {
    if (!isVisible) return;
    setShowLabel(true);
    const t = setTimeout(() => setShowLabel(false), 3000);
    return () => clearTimeout(t);
  }, [location.pathname, isVisible]);

  if (!isVisible) return null;

  const label = contextLabels[location.pathname] || "Minha equipe";

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onClick={() => navigate("/team-chat")}
        className="fixed z-40 right-5 bottom-[88px] flex items-center gap-2 gradient-orange rounded-full shadow-lg shadow-primary/30 active:shadow-primary/50 transition-shadow"
        style={{ padding: showLabel ? "12px 18px 12px 14px" : "14px" }}
      >
        <MessageCircle size={22} className="text-primary-foreground shrink-0" fill="currentColor" strokeWidth={0} />

        <AnimatePresence mode="wait">
          {showLabel && (
            <motion.span
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-xs font-semibold text-primary-foreground whitespace-nowrap overflow-hidden"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-white text-primary text-[10px] font-bold flex items-center justify-center px-1 shadow-sm">
            {unreadCount}
          </span>
        )}
      </motion.button>
    </AnimatePresence>
  );
}
