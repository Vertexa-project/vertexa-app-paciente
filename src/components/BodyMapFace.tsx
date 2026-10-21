import { BODY_VIEWBOX, OFFICIAL_MUSCLES, type BodySide } from "@/components/officialMuscles";
import { RECOVERY_COLOR, RECOVERY_LABEL_PT, type BodyZone } from "@/components/bodyMapZones";
import type { CanonicalMuscle, MuscleStatus } from "@/lib/api/types";

interface BodyMapFaceProps {
  side: BodySide;
  imgSrc: string;
  /** Status DERIVADO (recoveryRule) por grupo canônico. Ausente => neutral. */
  statusByMuscle: Partial<Record<CanonicalMuscle, MuscleStatus>>;
  onZoneTap: (zone: BodyZone) => void;
  selectedMuscle?: CanonicalMuscle | null;
}

/**
 * Uma face do corpo com o body map OFICIAL: PNG + SVG dos músculos no MESMO viewBox (coordenadas do PNG).
 * Cada músculo tem halo (brilho), tint (cor que respeita a textura), lift (realce) e hit (área de toque),
 * como no pacote oficial. O PNG precisa ficar logo atrás do SVG por causa do mix-blend-mode.
 */
export default function BodyMapFace({ side, imgSrc, statusByMuscle, onZoneTap, selectedMuscle }: BodyMapFaceProps) {
  const { w, h } = BODY_VIEWBOX[side];
  const muscles = OFFICIAL_MUSCLES.filter((m) => m.side === side);
  const glow = `vx-glow-${side}`;
  const soft = `vx-soft-${side}`;

  return (
    <div className="relative w-full h-full">
      <img
        src={imgSrc}
        alt={side === "front" ? "Corpo de frente" : "Corpo de costas"}
        className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
        draggable={false}
      />
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
        role="group"
        aria-label={`Mapa de recuperação — ${side === "front" ? "frente" : "costas"}`}
      >
        <defs>
          <filter id={glow} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9" /></filter>
          <filter id={soft} x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.2" /></filter>
        </defs>
        {muscles.map((m) => {
          const status: MuscleStatus = statusByMuscle[m.muscle] ?? "neutral";
          const color = status === "neutral" ? null : RECOVERY_COLOR[status];
          const selected = selectedMuscle === m.muscle;
          return (
            <g
              key={m.id}
              data-muscle={m.official}
              data-status={status}
              role="button"
              tabIndex={0}
              aria-label={`${m.labelPt}: ${RECOVERY_LABEL_PT[status]}`}
              className="cursor-pointer outline-none"
              onClick={() => onZoneTap({ muscle: m.muscle, labelPt: m.labelPt, side })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onZoneTap({ muscle: m.muscle, labelPt: m.labelPt, side });
                }
              }}
            >
              {color && (
                <>
                  <path d={m.d} fill={color} opacity={0.35} filter={`url(#${glow})`} style={{ pointerEvents: "none" }} />
                  <path d={m.d} fill={color} opacity={0.9} filter={`url(#${soft})`} style={{ mixBlendMode: "color", pointerEvents: "none" }} />
                  <path d={m.d} fill={color} opacity={0.28} filter={`url(#${soft})`} style={{ mixBlendMode: "screen", pointerEvents: "none" }} />
                </>
              )}
              {selected && <path d={m.d} fill="none" stroke="white" strokeOpacity={0.85} strokeWidth={3} style={{ pointerEvents: "none" }} />}
              <path d={m.d} fill="#fff" fillOpacity={0} style={{ pointerEvents: "all" }} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
