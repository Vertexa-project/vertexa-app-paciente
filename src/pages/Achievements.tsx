import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { achievements } from "@/data/mockData";
import { tracker } from "@/lib/eventTracker";
import BottomNav from "@/components/BottomNav";

export default function Achievements() {
  const navigate = useNavigate();

  useEffect(() => { tracker.track('achievement_unlocked'); }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Conquistas</h1>
        </div>

        <div className="flex items-center gap-4 mb-6 bg-card rounded-2xl p-4 shadow-card">
          <div className="w-14 h-14 rounded-2xl gradient-orange flex items-center justify-center shadow-orange">
            <span className="text-2xl">🏆</span>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{achievements.filter(a => a.unlocked).length}</p>
            <p className="text-xs text-muted-foreground">de {achievements.length} conquistas</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm font-semibold text-primary">18 dias</p>
            <p className="text-xs text-muted-foreground">sequência atual</p>
          </div>
        </div>

        {/* Shareable card preview */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 shadow-card mb-5 border border-primary/20">
          <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-2">Compartilhar conquista</p>
          <div className="bg-muted rounded-xl p-4 flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">5kg eliminados!</p>
              <p className="text-[10px] text-muted-foreground">Estou evoluindo com a VERTEXA 💪</p>
            </div>
            <button className="w-9 h-9 rounded-full gradient-orange flex items-center justify-center shadow-orange">
              <Share2 size={14} className="text-primary-foreground" />
            </button>
          </div>
        </motion.div>

        <div className="flex flex-col gap-3">
          {achievements.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-card rounded-xl p-4 flex items-center gap-3 ${!a.unlocked ? "opacity-50" : ""}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.unlocked ? "bg-primary/10" : "bg-muted"}`}>
                {a.unlocked ? <span className="text-2xl">{a.icon}</span> : <Lock size={20} className="text-muted-foreground" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.unlocked ? a.date : a.description}</p>
              </div>
              {a.unlocked && (
                <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Share2 size={14} className="text-muted-foreground" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
