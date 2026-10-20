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
  logSleep,
  getRecentSleep,
  uploadProgressPhoto,
  getLatestProgressPhoto,
  getMyWorkoutPlan,
  validateProgressPhotoFile,
  ProgressPhotoValidationError,
} from "@/lib/api";
import { PHOTO_POSES, POSE_LABEL, type PhotoPose } from "@/lib/photoPose";
import { formatSleepHours, localYmd, parseSleepHours, SLEEP_QUALITY_LABEL } from "@/lib/sleep";
import BottomNav from "@/components/BottomNav";
import ComingSoonLock, { NOTES_LOCK_REASON } from "@/components/ComingSoonLock";
import NoPrescriptionYet, { NO_WORKOUT_PLAN_TITLE, NO_WORKOUT_PLAN_MESSAGE } from "@/components/NoPrescriptionYet";

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

  // ── Plano de treino REAL (objetivo #5): registra os músculos reais e dá o workoutId de hoje ──
  // WP-APP-2 2.1: SEM FALLBACK. Este era o pior caso do WP — não era só exibição. Sem plano real,
  // `todayWorkout` vinha de `workoutSchedule` (mock) e "Concluir treino" GRAVAVA esse id de mock em
  // activity_events(workout_checked). Ou seja: a paciente registrava, no banco, a conclusão de um
  // treino que nunca lhe foi prescrito — que então alimentava recuperação muscular e VRI.
  // Agora, sem ficha publicada, não há o que registrar e o botão não existe.
  const { data: realPlan, isPending: planLoading, isError: planError, refetch: refetchPlan } = useQuery({
    queryKey: ["workoutPlan"],
    queryFn: getMyWorkoutPlan,
  });
  const schedule = realPlan ?? [];
  const hasRealPlan = schedule.length > 0;
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
  const [photoPose, setPhotoPose] = useState<PhotoPose | null>(null);
  const latestPhoto = useQuery({ queryKey: ["latestPhoto"], queryFn: getLatestProgressPhoto });

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Guarda de UX: MIME allowlist + tamanho (msg amigável e específica) antes de preparar o envio.
    // A barreira REAL continua sendo a RLS de storage.objects (P1) + a validação em uploadProgressPhoto.
    try {
      validateProgressPhotoFile(file);
    } catch (err) {
      if (err instanceof ProgressPhotoValidationError) flashError(err.message);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoPose(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const photoMutation = useMutation({
    mutationFn: ({ file, pose }: { file: File; pose: PhotoPose }) => uploadProgressPhoto(file, pose),
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
    if (!photoPose) {
      flashError("Escolha a posição da foto: frente, lado ou costas.");
      return;
    }
    photoMutation.mutate({ file: photoFile, pose: photoPose });
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
    // WP-METRIC-1b: a frase antiga era "Treino concluído! Recuperação e VRI atualizados ✨".
    // Ela AFIRMAVA duas coisas que esta tela não tem como saber no momento em que fala: que o
    // insert em activity_events entrou e que o servidor já recomputou recuperação e VRI. As duas
    // acontecem depois, em cadeia assíncrona no eventSync. Se o insert falhar, quem avisa é o
    // eventSync (toast) — aqui a tela só afirma o que ela de fato observou: o toque dela.
    flashSaved("Treino concluído!");
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

  // ── Sono: registro real em sleep_logs (1 por dia; reenviar o mesmo dia corrige) ──
  const [sleepHours, setSleepHours] = useState("7.5");
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [sleepDay, setSleepDay] = useState(localYmd());
  const recentSleep = useQuery({ queryKey: ["recentSleep"], queryFn: () => getRecentSleep(5) });
  const sleepMutation = useMutation({
    mutationFn: (v: { hours: number; quality: number | null; day: string }) => logSleep(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recentSleep"] });
      qc.invalidateQueries({ queryKey: ["sleepToday"] });
      flashSaved("Sono registrado!");
    },
    onError: () => flashError("Não foi possível registrar o sono."),
  });
  const handleSaveSleep = () => {
    const hours = parseSleepHours(sleepHours);
    if (hours == null) {
      flashError("Informe as horas dormidas (entre 0,5 e 24).");
      return;
    }
    if (!sleepDay || sleepDay > localYmd()) {
      flashError("Escolha o dia em que você acordou (hoje ou antes).");
      return;
    }
    sleepMutation.mutate({ hours, quality: sleepQuality, day: sleepDay });
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
              <p className="text-xs font-medium text-foreground mt-4 mb-2">Posição da foto</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Posição da foto">
                {PHOTO_POSES.map((pz) => (
                  <button
                    key={pz}
                    type="button"
                    role="radio"
                    aria-checked={photoPose === pz}
                    onClick={() => setPhotoPose(pz)}
                    className={`h-10 rounded-xl border text-xs font-semibold transition-colors ${photoPose === pz ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    {POSE_LABEL[pz]}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-center text-muted-foreground mt-2">Use sempre a mesma posição para comparar sua evolução</p>
              <button onClick={handleSendPhoto} disabled={photoMutation.isPending || !photoFile || !photoPose}
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
              {/* CARREGANDO -> skeleton. Sem isto, um piscar do estado vazio afirmaria
                  "não há ficha" antes de a leitura sequer resolver. */}
              {planLoading ? (
                <div className="flex flex-col gap-3">
                  {[0, 1].map((i) => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
                </div>
              ) : planError && !hasRealPlan ? (
                <div className="flex flex-col items-center gap-2 text-center py-2">
                  <p className="text-xs text-red-400">Não foi possível carregar seu treino.</p>
                  <button onClick={() => refetchPlan()} className="text-[11px] font-semibold text-primary">
                    Tentar novamente
                  </button>
                </div>
              ) : !hasRealPlan ? (
                // RESOLVEU e não há ficha: nada a registrar. Sem nome de treino, sem duração,
                // sem contagem de exercícios — e, principalmente, sem botão que grave um id falso.
                <NoPrescriptionYet
                  title={NO_WORKOUT_PLAN_TITLE}
                  message={NO_WORKOUT_PLAN_MESSAGE}
                  icon={Dumbbell}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="bg-muted rounded-xl p-3">
                    <p className="text-sm font-medium text-foreground">
                      Treino {todayWorkout.letter} — {todayWorkout.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {todayWorkout.dayOfWeek} • {todayWorkout.estimatedMinutes}min • {todayWorkout.exercises.length} exercícios
                    </p>
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
              )}
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
              <div className="flex items-center justify-center gap-2 mb-1">
                <input
                  aria-label="Horas dormidas"
                  type="text"
                  inputMode="decimal"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  className="text-4xl font-display font-bold text-foreground bg-transparent text-center w-24 focus:outline-none"
                />
                <span className="text-lg text-muted-foreground">h</span>
              </div>
              <p className="text-[10px] text-center text-muted-foreground mb-4">Quanto você dormiu na noite passada. Ex.: 7,5 = 7h30.</p>

              <label className="text-xs text-muted-foreground block mb-1.5" htmlFor="sleep-day">Dia em que você acordou</label>
              <input
                id="sleep-day"
                type="date"
                value={sleepDay}
                max={localYmd()}
                onChange={(e) => setSleepDay(e.target.value)}
                className="w-full h-10 rounded-lg bg-muted border border-border px-3 text-sm text-foreground mb-4"
              />

              <p className="text-xs text-muted-foreground mb-1.5">Como foi a qualidade do sono? (opcional)</p>
              <div className="grid grid-cols-5 gap-1.5 mb-4" role="radiogroup" aria-label="Qualidade do sono">
                {[1, 2, 3, 4, 5].map((q) => (
                  <button
                    key={q}
                    type="button"
                    role="radio"
                    aria-checked={sleepQuality === q}
                    aria-label={SLEEP_QUALITY_LABEL[q]}
                    onClick={() => setSleepQuality(sleepQuality === q ? null : q)}
                    className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${sleepQuality === q ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-center text-muted-foreground -mt-2 mb-4">
                {sleepQuality ? SLEEP_QUALITY_LABEL[sleepQuality] : "1 = muito ruim · 5 = ótima"}
              </p>

              <button onClick={handleSaveSleep} disabled={sleepMutation.isPending}
                className="w-full h-12 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm shadow-orange active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2">
                {sleepMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                {sleepMutation.isPending ? "Salvando..." : "Salvar"}
              </button>

              {(recentSleep.data?.length ?? 0) > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-foreground mb-2">Últimas noites</p>
                  <ul className="space-y-1.5">
                    {recentSleep.data!.map((r) => (
                      <li key={r.id} className="flex justify-between text-xs text-muted-foreground">
                        <span>{r.slept_on.split("-").reverse().join("/")}</span>
                        <span className="text-foreground font-medium">
                          {formatSleepHours(r.hours)}
                          {r.quality ? ` · ${SLEEP_QUALITY_LABEL[r.quality]}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          {activeRecord === "notes" && (
            /* CADEADO (WP-APP-6 item 3.1) — o gêmeo exato do sono, e o caso mais puro da tela.
               O <textarea> não tinha `value`, `onChange` nem `ref`: era não-controlado e nunca
               lido em lugar nenhum. O botão fazia `flashSaved("Observação salva!")` e MAIS NADA
               — nem uma chamada de rede. O texto que a paciente escrevia morria no unmount da
               aba, e ela saía com a confirmação na tela, achando que o profissional leria.
               Antes de bloquear eu procurei onde gravar de verdade: não existe destino legítimo
               em produção (o detalhe da varredura está em NOTES_LOCK_REASON). */
            <motion.div key="notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <ComingSoonLock title="Observações" reason={NOTES_LOCK_REASON} icon={FileText} />
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
