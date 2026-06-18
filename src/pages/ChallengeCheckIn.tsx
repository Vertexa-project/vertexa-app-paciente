import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Check, Trophy, Flame, TrendingUp, Share2,
  ArrowLeft, X, RotateCcw, Zap, Target, ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type Step = 'prompt' | 'camera' | 'preview' | 'validating' | 'success';

export default function ChallengeCheckIn() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('prompt');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    setStep('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      // Camera not available — use a placeholder for demo
      setPhotoUrl('demo');
      setStep('preview');
    }
  }, []);

  const takePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoUrl(url);
      }
    } else {
      setPhotoUrl('demo');
    }
    stopCamera();
    setStep('preview');
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const retake = () => {
    setPhotoUrl(null);
    startCamera();
  };

  const confirmPhoto = () => {
    setStep('validating');
    setTimeout(() => setStep('success'), 1800);
  };

  const anim = (d: number) => ({
    initial: { y: 16, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { delay: d, duration: 0.35 },
  });

  // ── Step: Prompt ──
  const renderPrompt = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-background flex flex-col">
      <div className="max-w-[430px] mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft size={22} className="text-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">Validar treino</span>
        </div>

        <div className="flex-1 flex flex-col justify-between p-5">
          {/* Hero */}
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
            <motion.div {...anim(0.1)} className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                <Camera size={44} className="text-primary" />
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Check size={16} className="text-primary-foreground" />
              </div>
            </motion.div>

            <motion.div {...anim(0.2)}>
              <h2 className="text-xl font-bold text-foreground mb-2">Falta um passo para pontuar</h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[300px] mx-auto">
                Valide seu treino com uma foto ao vivo para confirmar sua participação no desafio e liberar sua pontuação.
              </p>
            </motion.div>

            {/* Info chips */}
            <motion.div {...anim(0.3)} className="flex flex-col gap-2.5 w-full max-w-[320px]">
              {[
                { icon: <Camera size={16} />, text: 'Foto tirada em tempo real' },
                { icon: <Trophy size={16} />, text: 'Check-in valida sua pontuação' },
                { icon: <Target size={16} />, text: 'Garante fair play no desafio' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
                  <div className="text-primary">{item.icon}</div>
                  <span className="text-xs text-muted-foreground">{item.text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* CTA */}
          <motion.div {...anim(0.4)} className="space-y-3 pt-4">
            <button
              onClick={startCamera}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg"
            >
              <Camera size={20} />
              Tirar foto e validar treino
            </button>
            <p className="text-[10px] text-muted-foreground/60 text-center">
              A foto é capturada pela câmera do app em tempo real. Importação da galeria não é permitida.
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );

  // ── Step: Camera ──
  const renderCamera = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-background flex flex-col relative">
      <div className="max-w-[430px] mx-auto w-full flex-1 flex flex-col">
        {/* Camera viewfinder */}
        <div className="flex-1 relative bg-black rounded-b-3xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Overlay guides */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top bar */}
            <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between px-4 pointer-events-auto">
              <button onClick={() => { stopCamera(); setStep('prompt'); }} className="w-9 h-9 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center">
                <X size={18} className="text-foreground" />
              </button>
              <span className="text-xs font-medium text-foreground/80">Validação do desafio</span>
              <div className="w-9" />
            </div>
            {/* Bottom gradient */}
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        </div>

        {/* Shutter button */}
        <div className="py-8 flex items-center justify-center">
          <button
            onClick={takePhoto}
            className="w-20 h-20 rounded-full border-4 border-primary flex items-center justify-center active:scale-95 transition-transform"
          >
            <div className="w-16 h-16 rounded-full bg-primary" />
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );

  // ── Step: Preview ──
  const renderPreview = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-background flex flex-col">
      <div className="max-w-[430px] mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <button onClick={retake} className="p-1">
            <ArrowLeft size={22} className="text-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">Confirmar check-in</span>
        </div>

        <div className="flex-1 flex flex-col justify-between p-5">
          {/* Photo preview */}
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <motion.div {...anim(0.1)} className="w-full max-w-[300px] aspect-[3/4] rounded-2xl overflow-hidden border border-border bg-secondary relative">
              {photoUrl === 'demo' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-card to-secondary">
                  <Camera size={40} className="text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground/50">Prévia da foto</p>
                </div>
              ) : photoUrl ? (
                <img src={photoUrl} alt="Check-in" className="absolute inset-0 w-full h-full object-cover" />
              ) : null}
              {/* Overlay badge */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div className="px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-sm border border-border/50">
                  <p className="text-[10px] font-medium text-foreground">Treino A — Costas e Bíceps</p>
                </div>
              </div>
            </motion.div>

            <motion.div {...anim(0.2)} className="text-center">
              <p className="text-sm font-semibold text-foreground mb-1">Foto capturada com sucesso</p>
              <p className="text-xs text-muted-foreground">Confirme o envio para validar seu check-in no desafio</p>
            </motion.div>
          </div>

          {/* Actions */}
          <motion.div {...anim(0.3)} className="space-y-3 pt-4">
            <button
              onClick={confirmPhoto}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2.5"
            >
              <Check size={20} />
              Confirmar e pontuar
            </button>
            <button
              onClick={retake}
              className="w-full py-3 rounded-xl bg-secondary text-foreground font-medium text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              Tirar outra foto
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );

  // ── Step: Validating ──
  const renderValidating = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="max-w-[430px] mx-auto w-full text-center px-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary mx-auto mb-6"
        />
        <p className="text-lg font-bold text-foreground mb-2">Validando check-in…</p>
        <p className="text-sm text-muted-foreground">Enviando foto e registrando pontuação</p>
      </div>
    </motion.div>
  );

  // ── Step: Success ──
  const renderSuccess = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-background flex flex-col">
      <div className="max-w-[430px] mx-auto w-full flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
          {/* Animated success icon */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="relative"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/25 to-primary/5 border-2 border-primary/30 flex items-center justify-center">
              <Check size={44} className="text-primary" />
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center"
            >
              <Zap size={14} className="text-primary-foreground" />
            </motion.div>
          </motion.div>

          <motion.div {...anim(0.3)}>
            <h2 className="text-xl font-bold text-foreground mb-1">Check-in validado!</h2>
            <p className="text-sm text-muted-foreground">Seu treino foi registrado e sua pontuação atualizada</p>
          </motion.div>

          {/* Points & stats */}
          <motion.div {...anim(0.4)} className="w-full max-w-[320px] space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/15">
              <div className="flex items-center gap-3">
                <Trophy size={18} className="text-primary" />
                <span className="text-sm font-medium text-foreground">Pontos ganhos</span>
              </div>
              <span className="text-lg font-bold text-primary">+40</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-card border border-border text-center">
                <p className="text-lg font-bold text-foreground">#4</p>
                <p className="text-[9px] text-muted-foreground">Posição</p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border text-center">
                <div className="flex items-center justify-center gap-1">
                  <Flame size={14} className="text-primary" />
                  <p className="text-lg font-bold text-foreground">11</p>
                </div>
                <p className="text-[9px] text-muted-foreground">Streak</p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp size={14} className="text-emerald-400" />
                  <p className="text-lg font-bold text-foreground">1.100</p>
                </div>
                <p className="text-[9px] text-muted-foreground">Total pts</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Desafio Constância Abril</p>
                <p className="text-[10px] text-muted-foreground">Mais um passo na sua constância</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom actions */}
        <motion.div {...anim(0.5)} className="p-5 space-y-3">
          <button
            onClick={() => navigate('/share?type=workout')}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Share2 size={18} />
            Compartilhar conquista
          </button>
          <button
            onClick={() => navigate('/challenges')}
            className="w-full py-3 rounded-xl bg-secondary text-foreground font-medium text-sm flex items-center justify-center gap-2"
          >
            Ver ranking
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => navigate('/home')}
            className="w-full py-3 text-sm text-muted-foreground font-medium"
          >
            Voltar ao início
          </button>
        </motion.div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      {step === 'prompt' && renderPrompt()}
      {step === 'camera' && renderCamera()}
      {step === 'preview' && renderPreview()}
      {step === 'validating' && renderValidating()}
      {step === 'success' && renderSuccess()}
    </AnimatePresence>
  );
}