import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Scale, Camera, Dumbbell, Droplets, Moon, FileText, Check, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tracker } from "@/lib/eventTracker";
import {
  logWeight,
  getRecentWeightLogs,
  logHydration,
  uploadProgressPhoto,
  getLatestProgressPhoto,
  getMyWorkoutPlan,
} from "@/lib/api";
import { workoutSchedule } from "@/data/workoutData";
import BottomNav from "@/components/BottomNav";

const recordTypes = [
  { key: "weight", icon: Scale, label: "Peso" },
  { key: "photo", icon: Camera, label: "Foto" },
  { key: "workout", icon: Dumbbell, label: "Treino" },
  { key: "water", icon: Droplets, label: "Água" },
  { key: "sleep", icon: Moon, label: "Sono" },
  { key: "notes", icon: FileText, label: "Obs." },
];

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_PT[d.getMonth()]}`;
}

export default function Records() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeRecord, setActiveRecord] = useState("weight");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const flashSaved = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2500);
  };
  const flashError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 3000);
  };

  // Pendências (workout/peso/foto) e VRI são derivados que a Home relê ao montar (refetchOnMount):
  // as ações abaixo gravam nas tabelas canônicas (peso/foto direto; treino/peso/foto via eventSync),
  // então ao voltar para a Home a pendência some e o VRI atualiza — sem invalidação síncrona aqui
  // (que correria na frente das escritas assíncronas do eventSync).

  // ── Real workout plan (objetivo #5): registra os músculos reais e dá o workoutId de hoje ──
  const { data: realPlan } = useQuery({ queryKey: ["workoutPlan"], queryFn: getMyWorkoutPlan });
  const schedule = realPlan && realPlan.length > 0 ? realPlan : workoutSchedule;
  const todayWorkout = schedule.find((w) => w.dayIndex === new Date().getDay()) ?? schedule[0];

  // ── Weight ──
  const [weightVal, setWeightVal] = useState("");
  const prefilled = useRef(false);
  const recentWeights = useQuery({ queryKey: ["recentWeights"], queryFn: () => getRecentWeightLogs(6) });

  useEffect(() => {
    if (prefilled.current) return;
    const latest = recentWeights.data?.[0];
    if (latest) {
      setWeightVal(Number(latest.weight_kg).toFixed(1));
      prefilled.current = true;
    }
  }, [recentWeights.data]);

  const weightMutation = useMutation({
    mutationFn: (kg: number) => logWeight({ weightKg: kg }),
    onSuccess: () => {
      // activity_events(weight_logged) permanece como MARCADOR de Timeline (valor vai p/ weight_logs).
      tracker.track("weight_logged", { source: "app" });
      qc.invalidateQueries({ queryKey: ["recentWeights"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      flashSaved("Peso salvo! Sua jornada foi fortalecida ✨");
    },
    onError: () => flashError("Não foi possível salvar o peso. Tente de novo."),
  });

  const handleSaveWeight = () => {
    const kg = parseFloat(weightVal.replace(",", "."));
    if (!Number.isFinite(kg) || kg <= 0 || kg > 400) {
      flashError("Informe um peso válido em kg.");
      return;
    }
    weightMutation.mutate(kg);
  };

  // ── Photo ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const latestPhoto = useQuery({ queryKey: ["latestPhoto"], queryFn: getLatestProgressPhoto });

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const photoMutation = useMutation({
    mutationFn: (file: File) => uploadProgressPhoto(file),
    onSuccess: () => {
      tracker.track("progress_photo_uploaded", { source: "app" }); // MARCADOR de Timeline
      qc.invalidateQueries({ queryKey: ["latestPhoto"] });
      clearPhoto();
      flashSaved("Foto enviada! ✨");
    },
    onError: () => flashError("Falha no upload da foto. Tente de novo."),
  });

  const handleSendPhoto = () => {
    if (!photoFile) {
      flashError("Escolha uma foto (câmera ou galeria).");
      return;
    }
    photoMutation.mutate(photoFile);
  };

  // ── Workout (objetivo #5: carrega o workoutId real -> recuperação + VRI via eventSync) ──
  const [intensity, setIntensity] = useState<string | null>(null);
  const [workoutDone, setWorkoutDone] = useState(false);

  const handleCompleteWorkout = () => {
    if (!todayWorkout?.id) {
      flashError("Treino do dia indisponível.");
      return;
    }
    tracker.track("workout_checked", { workoutId: todayWorkout.id, action: "completed" });
    setWorkoutDone(true);
    flashSaved("Treino concluído! Recuperação e VRI atualizados ✨");
  };

  // ── Water ──
  const [waterVal, setWaterVal] = useState("0.5");
  const waterMutation = useMutation({
    mutationFn: (liters: number) => logHydration({ liters }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hydrationToday"] });
      flashSaved("Água registrada!");
    },
    onError: () => flashError("Não foi possível registrar a água."),
  });
  const handleSaveWater = () => {
    const liters = parseFloat(waterVal.replace(",", "."));
    if (!Number.isFinite(liters) || liters <= 0 || liters > 10) {
      flashError("Informe um valor de água válido (L).");
      return;
    }
    waterMutation.mutate(liters);
  };

  // ── Sleep (marcador de hábito; sem tabela própria) ──
  const handleSaveSleep = () => {
    tracker.track("sleep_logged", { source: "app" });
    flashSaved("Sono registrado!");
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
            <button key={r.key} onClick={() => { setActiveRecord(r.key); }}
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
                  <input type="number" step="0.1" value={weightVal} placeholder="0.0" onChange={e => setWeightVal(e.target.value)}
                    className="text-4xl font-display font-bold text-foreground bg-transparent text-center w-32 focus:outline-none" />
                  <span className="text-lg text-muted-foreground">kg</span>
                </div>
                <p className="text-[10px] text-center text-muted-foreground mb-3">Este registro fortalece sua jornada e atualiza seu VRI</p>
                <button onClick={handleSaveWeight} disabled={weightMutation.isPending}
                  className="w-full h-12 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm shadow-orange active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2">
                  {weightMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  {weightMutation.isPending ? "Salvando..." : "Salvar registro"}
                </button>
              </div>
              <div className="bg-card rounded-2xl p-5 shadow-card">
                <h3 className="text-sm font-semibold text-foreground mb-3">Histórico recente</h3>
                {recentWeights.isLoading ? (
                  <p className="text-xs text-muted-foreground py-2">Carregando...</p>
                ) : (recentWeights.data?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Nenhum registro ainda. Salve seu primeiro peso acima.</p>
                ) : (
                  recentWeights.data!.map((h) => (
                    <div key={h.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                      <span className="text-xs text-muted-foreground">{formatDayMonth(h.measured_at)}</span>
                      <span className="text-sm font-medium text-foreground">{Number(h.weight_kg).toFixed(1)}kg</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeRecord === "photo" && (
            <motion.div key="photo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-card rounded-2xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Foto evolutiva</h3>
              {/* câmera E galeria: input de imagem sem `capture` deixa o sistema oferecer ambas (decisão C3) */}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl h-48 flex flex-col items-center justify-center gap-2 overflow-hidden"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Pré-visualização" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={32} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Toque para tirar ou enviar foto</span>
                  </>
                )}
              </button>
              {photoFile && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-muted-foreground truncate max-w-[260px]">{photoFile.name}</span>
                  <button onClick={clearPhoto} className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <X size={12} /> remover
                  </button>
                </div>
              )}
              <p className="text-[10px] text-center text-muted-foreground mt-2">Fotos de acompanhamento ajudam a visualizar sua evolução</p>
              <button onClick={handleSendPhoto} disabled={photoMutation.isPending || !photoFile}
                className="w-full h-12 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm shadow-orange active:scale-[0.98] transition-transform mt-4 disabled:opacity-60 flex items-center justify-center gap-2">
                {photoMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                {photoMutation.isPending ? "Enviando..." : "Enviar foto"}
              </button>
              {latestPhoto.data?.taken_at && (
                <p className="text-[10px] text-center text-muted-foreground mt-2">
                  Última foto: {formatDayMonth(latestPhoto.data.taken_at)}
                </p>
              )}
            </motion.div>
          )}

          {activeRecord === "workout" && (
            <motion.div key="workout" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-card rounded-2xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Registrar treino</h3>
              <div className="flex flex-col gap-3">
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-sm font-medium text-foreground">
                    {todayWorkout ? `Treino ${todayWorkout.letter} — ${todayWorkout.name}` : "Treino do dia"}
                  </p>
                  {todayWorkout && (
                    <p className="text-xs text-muted-foreground">
                      {todayWorkout.dayOfWeek} • {todayWorkout.estimatedMinutes}min • {todayWorkout.exercises.length} exercícios
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Como foi o treino?</label>
                  <div className="flex gap-2">
                    {["Leve", "Moderado", "Intenso"].map((l) => (
                      <button key={l} onClick={() => setIntensity(l)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                          intensity === l ? "gradient-orange text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>{l}</button>
                    ))}
                  </div>
                </div>
                <button onClick={handleCompleteWorkout} disabled={workoutDone}
                  className="w-full h-12 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm shadow-orange active:scale-[0.98] transition-transform mt-2 disabled:opacity-60">
                  {workoutDone ? "Treino concluído ✓" : "Concluir treino"}
                </button>
              </div>
            </motion.div>
          )}

          {activeRecord === "water" && (
            <motion.div key="water" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-card rounded-2xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Registrar água</h3>
              <div className="flex items-center justify-center gap-2 mb-4">
                <input type="number" step="0.1" value={waterVal} onChange={e => setWaterVal(e.target.value)}
                  className="text-4xl font-display font-bold text-foreground bg-transparent text-center w-24 focus:outline-none" />
                <span className="text-lg text-muted-foreground">L</span>
              </div>
              <p className="text-[10px] text-center text-muted-foreground mb-3">Soma ao total de hoje. A meta diária é de 2,5L.</p>
              <button onClick={handleSaveWater} disabled={waterMutation.isPending}
                className="w-full h-12 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm shadow-orange active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2">
                {waterMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                {waterMutation.isPending ? "Salvando..." : "Salvar"}
              </button>
            </motion.div>
          )}

          {activeRecord === "sleep" && (
            <motion.div key="sleep" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-card rounded-2xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Registrar sono</h3>
              <div className="flex items-center justify-center gap-2 mb-4">
                <input type="number" step="0.5" defaultValue="7.5"
                  className="text-4xl font-display font-bold text-foreground bg-transparent text-center w-24 focus:outline-none" />
                <span className="text-lg text-muted-foreground">h</span>
              </div>
              <button onClick={handleSaveSleep}
                className="w-full h-12 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm shadow-orange active:scale-[0.98] transition-transform mt-3">
                Salvar
              </button>
            </motion.div>
          )}

          {activeRecord === "notes" && (
            <motion.div key="notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-card rounded-2xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Observações</h3>
              <textarea placeholder="Escreva suas observações..."
                className="w-full h-32 bg-muted rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <button onClick={() => flashSaved("Observação salva!")}
                className="w-full h-12 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm shadow-orange active:scale-[0.98] transition-transform mt-3">
                Salvar
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success / error feedback */}
        <AnimatePresence>
          {savedMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-success text-success-foreground px-5 py-3 rounded-full flex items-center gap-2 shadow-lg z-50"
            >
              <Check size={16} />
              <span className="text-sm font-medium">{savedMsg}</span>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-5 py-3 rounded-full flex items-center gap-2 shadow-lg z-50"
            >
              <X size={16} />
              <span className="text-sm font-medium">{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
