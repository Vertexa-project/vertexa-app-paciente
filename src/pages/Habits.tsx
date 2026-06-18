import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Droplets, Moon, Footprints, Smile, Plus, Minus, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { habitTracking } from "@/data/mockData";
import { tracker } from "@/lib/eventTracker";
import BottomNav from "@/components/BottomNav";

export default function Habits() {
  const navigate = useNavigate();
  const [water, setWater] = useState(habitTracking.water.current);
  const [mood, setMood] = useState(habitTracking.mood);
  const [saved, setSaved] = useState<string | null>(null);

  const showSaved = useCallback((label: string) => {
    setSaved(label);
    setTimeout(() => setSaved(null), 1500);
  }, []);

  const addWater = () => {
    const newVal = Math.min(5, water + 0.25);
    setWater(newVal);
    tracker.track('hydration_logged', { amount: newVal });
    showSaved('Água registrada!');
  };

  const removeWater = () => setWater(Math.max(0, water - 0.25));

  const logMood = (m: string) => {
    setMood(m as typeof mood);
    tracker.track('mood_logged', { mood: m });
    showSaved('Humor registrado!');
  };

  const moods = [
    { key: "otimo", label: "Ótimo", emoji: "😄" },
    { key: "bem", label: "Bem", emoji: "🙂" },
    { key: "neutro", label: "Neutro", emoji: "😐" },
    { key: "mal", label: "Mal", emoji: "😔" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Hábitos do dia</h1>
        </div>

        {/* Water */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 shadow-card mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Droplets size={20} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Hidratação</h3>
            </div>
            <span className="text-xs text-muted-foreground">{water.toFixed(1)}L / 2.5L</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
            <motion.div className={`h-full rounded-full ${water >= 2.5 ? 'bg-success' : 'gradient-orange'}`} animate={{ width: `${Math.min((water / 2.5) * 100, 100)}%` }} />
          </div>
          <div className="flex items-center justify-center gap-6">
            <button onClick={removeWater} className="w-12 h-12 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform">
              <Minus size={20} className="text-foreground" />
            </button>
            <div className="text-center">
              <span className="text-3xl font-display font-bold text-foreground">{water.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground ml-1">L</span>
            </div>
            <button onClick={addWater} className="w-12 h-12 rounded-full gradient-orange flex items-center justify-center shadow-orange active:scale-95 transition-transform">
              <Plus size={20} className="text-primary-foreground" />
            </button>
          </div>
          {water >= 2.5 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs text-success font-medium mt-3">
              ✓ Meta de hidratação atingida!
            </motion.p>
          )}
        </motion.div>

        {/* Sleep */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-5 shadow-card mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Moon size={20} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Sono</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl font-display font-bold text-foreground">{habitTracking.sleep.hours}</span>
              <span className="text-sm text-muted-foreground ml-1">horas</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Qualidade: <span className="text-success font-medium">{habitTracking.sleep.quality}</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{habitTracking.sleep.bedtime} → {habitTracking.sleep.wakeup}</p>
            </div>
          </div>
        </motion.div>

        {/* Steps */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-5 shadow-card mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Footprints size={20} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Passos</h3>
            </div>
            <span className="text-xs text-muted-foreground">{habitTracking.steps.current.toLocaleString()} / {habitTracking.steps.target.toLocaleString()}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full rounded-full gradient-orange" initial={{ width: 0 }}
              animate={{ width: `${(habitTracking.steps.current / habitTracking.steps.target) * 100}%` }} transition={{ duration: 0.8 }} />
          </div>
        </motion.div>

        {/* Mood */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl p-5 shadow-card mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Smile size={20} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Como você está?</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {moods.map((m) => (
              <button key={m.key} onClick={() => logMood(m.key)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${
                  mood === m.key ? "gradient-orange shadow-orange" : "bg-muted"
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className={`text-[10px] font-medium ${mood === m.key ? "text-primary-foreground" : "text-muted-foreground"}`}>{m.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Save feedback */}
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-success text-success-foreground px-5 py-3 rounded-full flex items-center gap-2 shadow-lg z-50"
            >
              <Check size={16} />
              <span className="text-sm font-medium">{saved}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
