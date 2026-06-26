import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RotateCw } from "lucide-react";
import BodyMapFace from "@/components/BodyMapFace";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  RECOVERY_DOT,
  RECOVERY_LABEL_PT,
  RECOVERY_LEGEND_ORDER,
  type BodySide,
  type BodyZone,
} from "@/components/bodyMapZones";
import { useMuscleRecovery } from "@/hooks/useMuscleRecovery";
import { recoveryStatusForLastTrained } from "@/lib/recoveryRule";
import { daysAgoLocal } from "@/lib/pendingLogic";
import type { CanonicalMuscle, MuscleStatus } from "@/lib/api/types";
import bodyFront from "@/assets/body/Body_front.png";
import bodyBack from "@/assets/body/Body_back.png";

interface MuscleMeta {
  status: MuscleStatus;
  daysAgo: number | null;
  lastTrainedAt: string | null;
}

const FLIP_MS = 0.42;

export default function DynamicBodyMap() {
  const { rows, isLoading } = useMuscleRecovery();
  const reduced = useReducedMotion();
  const [side, setSide] = useState<BodySide>("front");
  const [selected, setSelected] = useState<BodyZone | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  // Tira a face oculta do flip da ordem de tab / árvore de acessibilidade / hit-test.
  useEffect(() => {
    if (frontRef.current) frontRef.current.inert = side !== "front";
    if (backRef.current) backRef.current.inert = side !== "back";
  }, [side, reduced, isLoading]);

  const openZone = (zone: BodyZone) => {
    setSelected(zone);
    setSheetOpen(true);
  };

  // "now" estável durante a montagem (a derivação por dias não precisa reagir ao relógio).
  const now = useMemo(() => new Date(), []);

  // Status DERIVADO de last_trained_at (recoveryRule) — a coluna `status` do banco é provisória.
  const byMuscle = useMemo(() => {
    const map: Partial<Record<CanonicalMuscle, MuscleMeta>> = {};
    for (const r of rows) {
      map[r.muscle_group] = {
        status: recoveryStatusForLastTrained(r.last_trained_at, now),
        daysAgo: r.last_trained_at ? daysAgoLocal(r.last_trained_at, now) : null,
        lastTrainedAt: r.last_trained_at,
      };
    }
    return map;
  }, [rows, now]);

  const statusByMuscle = useMemo(() => {
    const map: Partial<Record<CanonicalMuscle, MuscleStatus>> = {};
    for (const [muscle, meta] of Object.entries(byMuscle)) {
      map[muscle as CanonicalMuscle] = meta!.status;
    }
    return map;
  }, [byMuscle]);

  const flip = () => setSide((s) => (s === "front" ? "back" : "front"));

  const selectedMeta: MuscleMeta = selected
    ? byMuscle[selected.muscle] ?? { status: "neutral", daysAgo: null, lastTrainedAt: null }
    : { status: "neutral", daysAgo: null, lastTrainedAt: null };

  const faceProps = {
    statusByMuscle,
    onZoneTap: openZone,
    selectedMuscle: selected?.muscle ?? null,
  };

  return (
    <div>
      {/* Corpo */}
      <div className="relative mx-auto w-full max-w-[290px]" style={{ perspective: 1200 }}>
        {isLoading ? (
          <div className="w-full aspect-[816/1456] rounded-2xl bg-muted/40 animate-pulse" aria-busy="true" />
        ) : reduced ? (
          // prefers-reduced-motion: troca direta de face, sem rotação 3D.
          <div className="relative w-full aspect-[816/1456]">
            <BodyMapFace side={side} imgSrc={side === "front" ? bodyFront : bodyBack} {...faceProps} />
          </div>
        ) : (
          <motion.div
            className="relative w-full aspect-[816/1456]"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: side === "front" ? 0 : 180 }}
            transition={{ duration: FLIP_MS, ease: "easeInOut" }}
            onPanEnd={(_e, info) => {
              if (Math.abs(info.offset.x) > 60) flip();
            }}
          >
            <div ref={frontRef} className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
              <BodyMapFace side="front" imgSrc={bodyFront} {...faceProps} />
            </div>
            <div
              ref={backRef}
              className="absolute inset-0"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <BodyMapFace side="back" imgSrc={bodyBack} {...faceProps} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Girar corpo */}
      <div className="flex items-center justify-center mt-3">
        <button
          onClick={flip}
          aria-label={side === "front" ? "Girar para as costas" : "Girar para a frente"}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/60 text-xs font-semibold text-foreground active:scale-95 transition-transform"
        >
          <RotateCw size={14} className="text-primary" />
          Girar corpo
          <span className="text-muted-foreground font-normal">· {side === "front" ? "Frente" : "Costas"}</span>
        </button>
      </div>

      {/* Legenda dos 5 estados */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 px-1">
        {RECOVERY_LEGEND_ORDER.map((st) => (
          <div key={st} className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${RECOVERY_DOT[st]}`} />
            <span className="text-[11px] text-muted-foreground">{RECOVERY_LABEL_PT[st]}</span>
          </div>
        ))}
      </div>

      {/* Bottom sheet ao tocar uma zona (Radix Sheet: Esc, focus-trap, aria-modal, scroll-lock,
          devolução de foco e fundo inerte). `selected` é mantido durante a animação de saída. */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="bg-card border-border rounded-t-3xl max-w-[430px] mx-auto pb-10"
        >
          {selected && (
            <>
              <SheetTitle className="font-display text-base text-foreground">
                {selected.labelPt}
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  {selected.side === "front" ? "Frente" : "Costas"}
                </span>
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${RECOVERY_DOT[selectedMeta.status]}`} />
                <span className="text-sm font-semibold text-foreground">
                  {RECOVERY_LABEL_PT[selectedMeta.status]}
                </span>
              </div>
              <SheetDescription className="text-[13px] leading-relaxed">
                {selectedMeta.daysAgo === null ? (
                  "Sem estímulo registrado. Conclua um treino que trabalhe esta região para começar a acompanhar a recuperação."
                ) : (
                  <>
                    Último estímulo{" "}
                    <span className="text-foreground font-medium">
                      {selectedMeta.daysAgo === 0
                        ? "hoje"
                        : `há ${selectedMeta.daysAgo} ${selectedMeta.daysAgo === 1 ? "dia" : "dias"}`}
                    </span>
                    {selectedMeta.lastTrainedAt && (
                      <>
                        {" "}
                        ·{" "}
                        {new Date(selectedMeta.lastTrainedAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </>
                    )}
                    . A cor reflete os dias desde o treino, não um valor fixo.
                  </>
                )}
              </SheetDescription>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
