import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Scale, Camera, Dumbbell, Droplets, Moon, FileText, Check, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { tracker } from "@/lib/eventTracker";
import BottomNav from "@/components/BottomNav";

const recordTypes = [
  { key: "weight", icon: Scale, label: "Peso" },
  { key: "photo", icon: Camera, label: "Foto" },
  { key: "workout", icon: Dumbbell, label: "Treino" },
  { key: "water", icon: Droplets, label: "Água" },
  { key: "sleep", icon: Moon, label: "Sono" },
  { key: "notes", icon: FileText, label: "Obs." },
];

export default function Records() {
  const navigate = useNavigate();
  const [activeRecord, setActiveRecord] = useState("weight");
  const [saved, setSaved] = useState(false);
  const [weightVal, setWeightVal] = useState("68.4");

  const handleSave = () => {
    setSaved(true);
    // Track the appropriate event
    const eventMap: Record<string, string> = {
      weight: 'weight_logged',
      photo: 'progress_photo_uploaded',
      workout: 'workout_checked',
      water: 'hydration_logged',
      sleep: 'sleep_logged',
    };
    const eventType = eventMap[activeRecord];
    if (eventType) tracker.track(eventType as any, { source: 'records' });
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Registros</h1>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {recordTypes.map((r) => (
            <button key={r.key} onClick={() => { setActiveRecord(r.key); setSaved(false); }}
              className={`flex flex-col items-center gap-2 py-3 rounded-xl transition-all ${
                activeRecord === r.key ? "gradient-orange shadow-orange" : "bg-card"
              }`}
            >
              <r.icon size={20} className={activeRecord === r.key ? "text-primary-foreground" : "text-muted-foreground"} />
              <span className={`text-[11px] font-medium ${activeRecord === r.key ? "text-primary-foreground" : "text-muted-foreground"}`}>{r.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeRecord === "weight" && (
            <motion.div key="weight" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
              <div className="bg-card rounded-2xl p-5 shadow-card">
                <h3 className="text-sm font-semibold text-foreground mb-4">Registrar peso</h3>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <input type="number" step="0.1" value={weightVal} onChange={e => setWeightVal(e.target.value)}
                    className="text-4xl font-display font-bold text-foreground bg-transparent text-center w-32 focus:outline-none" />
                  <span className="text-lg text-muted-foreground">kg</span>
                </div>
                <p className="text-[10px] text-center text-muted-foreground mb-3">Este registro fortalece sua jornada e atualiza seu VRI</p>
                <button onClick={handleSave} className="w-full h-12 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm shadow-orange active:scale-[0.98] transition-transform">
                  Salvar registro
                </button>
              </div>
              <div className="bg-card rounded-2xl p-5 shadow-card">
                <h3 className="text-sm font-semibold text-foreground mb-3">Histórico recente</h3>
                {[
                  { date: "25 Jun", weight: "68.4kg" },
                  { date: "18 Jun", weight: "68.9kg" },
                  { date: "11 Jun", weight: "69.3kg" },
                  { date: "04 Jun", weight: "69.8kg" },
                ].map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <span className="text-xs text-muted-foreground">{h.date}</span>
                    <span className="text-sm font-medium text-foreground">{h.weight}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeRecord === "photo" && (
            <motion.div key="photo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-card rounded-2xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Foto evolutiva</h3>
              <div className="border-2 border-dashed border-border rounded-xl h-48 flex flex-col items-center justify-center gap-2">
                <Camera size={32} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Toque para tirar ou enviar foto</span>
              </div>
              <p className="text-[10px] text-center text-muted-foreground mt-2">Fotos de acompanhamento ajudam a visualizar sua evolução</p>
              <button onClick={handleSave} className="w-full h-12 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm shadow-orange active:scale-[0.98] transition-transform mt-4">
                Enviar foto
              </button>
            </motion.div>
          )}

          {activeRecord === "workout" && (
            <motion.div key="workout" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-card rounded-2xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Registrar treino</h3>
              <div className="flex flex-col gap-3">
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-sm font-medium text-foreground">Treino C — Full Body</p>
                  <p className="text-xs text-muted-foreground">Quinta • 45min • 5 exercícios</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Como foi o treino?</label>
                  <div className="flex gap-2">
                    {["Leve", "Moderado", "Intenso"].map((l) => (
                      <button key={l} className="flex-1 py-2 rounded-lg bg-muted text-xs text-muted-foreground font-medium active:gradient-orange active:text-primary-foreground transition-all">{l}</button>
                    ))}
                  </div>
                </div>
                <button onClick={handleSave} className="w-full h-12 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm shadow-orange active:scale-[0.98] transition-transform mt-2">
                  Concluir treino
                </button>
              </div>
            </motion.div>
          )}

          {(activeRecord === "water" || activeRecord === "sleep" || activeRecord === "notes") && (
            <motion.div key={activeRecord} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-card rounded-2xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                {activeRecord === "water" ? "Registrar água" : activeRecord === "sleep" ? "Registrar sono" : "Observações"}
              </h3>
              {activeRecord === "notes" ? (
                <textarea placeholder="Escreva suas observações..."
                  className="w-full h-32 bg-muted rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
              ) : (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <input type="number" step={activeRecord === "water" ? "0.1" : "0.5"} defaultValue={activeRecord === "water" ? "2.0" : "7.5"}
                    className="text-4xl font-display font-bold text-foreground bg-transparent text-center w-24 focus:outline-none" />
                  <span className="text-lg text-muted-foreground">{activeRecord === "water" ? "L" : "h"}</span>
                </div>
              )}
              <button onClick={handleSave} className="w-full h-12 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm shadow-orange active:scale-[0.98] transition-transform mt-3">
                Salvar
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success feedback */}
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-success text-success-foreground px-5 py-3 rounded-full flex items-center gap-2 shadow-lg z-50"
            >
              <Check size={16} />
              <span className="text-sm font-medium">Salvo! Sua jornada foi fortalecida ✨</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
