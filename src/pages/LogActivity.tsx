import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Clock, Flame, Watch, Smartphone, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ACTIVITY_MODALITIES, type ActivityModality } from "@/lib/activityModalities";
import { logActivitySession } from "@/lib/api";
import { tracker } from "@/lib/eventTracker";

const durationPresets = [15, 30, 45, 60, 90];

type Step = "modality" | "details" | "success";

export default function LogActivity() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("modality");
  const [selected, setSelected] = useState<ActivityModality | null>(null);
  const [duration, setDuration] = useState(30);
  const [source, setSource] = useState<"manual" | "device">("manual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimatedCal = selected ? selected.calPerMin * duration : 0;

  // Persiste a atividade complementar de VERDADE (activity_sessions) + dispara o MARCADOR
  // 'activity_logged' (eventSync espelha em activity_events e recomputa o VRI) ANTES de navegar
  // para o sucesso. Se a escrita falhar, NÃO avança — mostra o erro e permite tentar de novo.
  const handleSave = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      await logActivitySession({
        modality: selected.slug,
        durationMin: duration,
        calories: estimatedCal,
        source,
      });
      tracker.track("activity_logged", {
        modality: selected.slug,
        duration_min: duration,
        calories: estimatedCal,
        source,
      });
      setStep("success");
    } catch {
      setError("Não foi possível salvar sua atividade. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[430px] mx-auto px-5 pt-14 pb-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => step === "modality" ? navigate(-1) : setStep("modality")} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Atividade complementar</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Registre sua atividade extra do dia</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 1: Select modality ── */}
          {step === "modality" && (
            <motion.div key="modality" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <p className="text-sm font-semibold text-foreground mb-1">Qual modalidade?</p>
              <p className="text-[11px] text-muted-foreground mb-5">Selecione a atividade que você praticou</p>

              <div className="grid grid-cols-2 gap-3">
                {ACTIVITY_MODALITIES.map((m) => (
                  <button
                    key={m.slug}
                    onClick={() => { setSelected(m); setStep("details"); setError(null); }}
                    className="bg-card rounded-2xl p-4 flex items-center gap-3 border border-border hover:border-primary/40 transition-all text-left shadow-card"
                  >
                    <span className="text-2xl">{m.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{m.label}</p>
                      <p className="text-[10px] text-muted-foreground">~{m.calPerMin} kcal/min</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Info notice */}
              <div className="mt-6 bg-primary/5 border border-primary/10 rounded-xl p-4">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="text-primary font-semibold">Atividade complementar</span> — Essas atividades somam no seu progresso geral e constância, mas não substituem seu plano principal de treino.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Duration & details ── */}
          {step === "details" && selected && (
            <motion.div key="details" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              {/* Selected modality card */}
              <div className="bg-card rounded-2xl p-4 flex items-center gap-4 mb-6 shadow-card border border-border">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">{selected.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{selected.label}</p>
                  <p className="text-[11px] text-muted-foreground">Atividade complementar</p>
                </div>
                <button onClick={() => setStep("modality")} className="text-[11px] text-primary font-medium">Trocar</button>
              </div>

              {/* Duration */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-primary" />
                  <p className="text-sm font-semibold text-foreground">Duração</p>
                </div>
                <div className="flex gap-2 mb-3">
                  {durationPresets.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        duration === d ? "gradient-orange text-primary-foreground" : "bg-card text-muted-foreground border border-border"
                      }`}
                    >
                      {d}min
                    </button>
                  ))}
                </div>
                {/* Custom input */}
                <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-border">
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, Math.min(300, Number(e.target.value))))}
                    className="flex-1 bg-transparent text-foreground text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-muted-foreground">minutos</span>
                </div>
              </div>

              {/* Estimated calories */}
              <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={14} className="text-amber-400" />
                  <p className="text-xs text-muted-foreground">Calorias estimadas</p>
                </div>
                <p className="text-2xl font-display font-bold text-foreground">
                  {estimatedCal.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">kcal</span>
                </p>
              </div>

              {/* Data source */}
              <div className="mb-8">
                <p className="text-xs text-muted-foreground mb-3">Origem do registro</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSource("manual")}
                    className={`flex-1 flex items-center gap-2.5 p-3.5 rounded-xl border transition-all ${
                      source === "manual" ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <Smartphone size={16} className={source === "manual" ? "text-primary" : "text-muted-foreground"} />
                    <div className="text-left">
                      <p className={`text-xs font-semibold ${source === "manual" ? "text-primary" : "text-foreground"}`}>Manual</p>
                      <p className="text-[10px] text-muted-foreground">Informar dados</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setSource("device")}
                    className={`flex-1 flex items-center gap-2.5 p-3.5 rounded-xl border transition-all ${
                      source === "device" ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <Watch size={16} className={source === "device" ? "text-primary" : "text-muted-foreground"} />
                    <div className="text-left">
                      <p className={`text-xs font-semibold ${source === "device" ? "text-primary" : "text-foreground"}`}>Dispositivo</p>
                      <p className="text-[10px] text-muted-foreground">Em breve</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                aria-label="Salvar atividade"
                aria-busy={saving}
                className="w-full py-4 rounded-2xl gradient-orange text-primary-foreground font-display font-bold text-base shadow-orange flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                {saving ? "Salvando…" : "Salvar atividade"}
              </button>
              {error && (
                <p role="alert" className="mt-3 text-center text-xs text-red-400">{error}</p>
              )}
            </motion.div>
          )}

          {/* ── Step 3: Success ── */}
          {step === "success" && selected && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center pt-10"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-20 h-20 rounded-full gradient-orange flex items-center justify-center mb-6 shadow-orange"
              >
                <Check size={36} className="text-primary-foreground" />
              </motion.div>

              <h2 className="text-xl font-display font-bold text-foreground mb-2">Atividade registrada!</h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-[280px]">
                <span className="text-primary font-semibold">{selected.label}</span> · {duration} min · {estimatedCal} kcal
              </p>

              {/* Impact summary */}
              <div className="w-full bg-card rounded-2xl p-5 shadow-card border border-border mb-6">
                <p className="text-xs text-muted-foreground mb-3">Impacto no seu dia</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-lg font-display font-bold text-primary">{duration}</p>
                    <p className="text-[10px] text-muted-foreground">min</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-display font-bold text-foreground">{estimatedCal}</p>
                    <p className="text-[10px] text-muted-foreground">kcal</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-display font-bold text-emerald-400">✓</p>
                    <p className="text-[10px] text-muted-foreground">constância</p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground mb-6 px-4 leading-relaxed">
                Atividades complementares somam como <span className="text-primary font-semibold">bônus</span> no seu ranking e constância, mas seu plano principal continua sendo a base da sua pontuação.
              </p>

              <button
                onClick={() => navigate("/progress")}
                className="w-full py-4 rounded-2xl gradient-orange text-primary-foreground font-display font-bold text-base shadow-orange"
              >
                Ver meu progresso
              </button>
              <button
                onClick={() => navigate("/home")}
                className="mt-3 text-sm text-muted-foreground font-medium"
              >
                Voltar ao início
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}