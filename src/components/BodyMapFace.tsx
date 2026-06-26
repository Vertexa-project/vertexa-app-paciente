import {
  FACE_VIEWBOX,
  RECOVERY_FILL,
  RECOVERY_LABEL_PT,
  RECOVERY_STROKE,
  ZONES_BY_SIDE,
  resolveZonePaths,
  type BodySide,
  type BodyZone,
} from "@/components/bodyMapZones";
import BodyMapDebug from "@/components/BodyMapDebug";
import type { CanonicalMuscle, MuscleStatus } from "@/lib/api/types";

interface BodyMapFaceProps {
  side: BodySide;
  imgSrc: string;
  /** Status DERIVADO (recoveryRule) por grupo canônico. Ausente => neutral. */
  statusByMuscle: Partial<Record<CanonicalMuscle, MuscleStatus>>;
  onZoneTap: (zone: BodyZone) => void;
  selectedMuscle?: CanonicalMuscle | null;
  /** Overlay de calibração (dev-only): só tem efeito sob import.meta.env.DEV. */
  debug?: boolean;
}

// Expansão leve da área de TOQUE (em torno do centro do músculo): alvo confortável no mobile
// sem invadir claramente o vizinho. A forma visível continua no contorno real.
const HIT_SCALE = 1.07;

/**
 * Uma face do corpo: PNG oficial (object-contain) + overlay SVG das zonas no MESMO box.
 * Cada zona é um <g> clicável; o blob é um <path> que segue o CONTORNO do músculo, pintado pelo
 * token do status, sem filtro na imagem (a anatomia continua visível pelo fill-opacity).
 */
export default function BodyMapFace({
  side,
  imgSrc,
  statusByMuscle,
  onZoneTap,
  selectedMuscle,
  debug = false,
}: BodyMapFaceProps) {
  const { w, h } = FACE_VIEWBOX[side];
  const zones = ZONES_BY_SIDE[side];

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
        {zones.map((zone) => {
          const status: MuscleStatus = statusByMuscle[zone.muscle] ?? "neutral";
          const isSelected = selectedMuscle === zone.muscle;
          return (
            <g
              key={zone.id}
              role="button"
              tabIndex={0}
              aria-label={`${zone.labelPt}: ${RECOVERY_LABEL_PT[status]}`}
              className="cursor-pointer outline-none"
              onClick={() => onZoneTap(zone)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onZoneTap(zone);
                }
              }}
            >
              {resolveZonePaths(zone).map((rp, i) => (
                <g key={i}>
                  {/* área de toque transparente (leve expansão em torno do centro do músculo) */}
                  <path
                    d={rp.d}
                    fill="transparent"
                    // Hooks de calibração/validação só em DEV (tree-shake remove de produção).
                    {...(import.meta.env.DEV
                      ? { "data-muscle": zone.muscle, "data-cx": rp.center.x, "data-cy": rp.center.y }
                      : {})}
                    transform={`translate(${rp.center.x} ${rp.center.y}) scale(${HIT_SCALE}) translate(${-rp.center.x} ${-rp.center.y})`}
                    style={{ pointerEvents: "all" }}
                  />
                  {/* forma visível pintada pelo token do status (segue o contorno do músculo) */}
                  <path
                    d={rp.d}
                    className={`${RECOVERY_FILL[status]} ${RECOVERY_STROKE[status]} transition-colors duration-300`}
                    style={{
                      pointerEvents: "none",
                      fillOpacity: status === "neutral" ? 0.22 : 0.5,
                      strokeOpacity: isSelected ? 0.95 : 0.65,
                      strokeWidth: isSelected ? 1.2 : 0.6,
                    }}
                  />
                </g>
              ))}
            </g>
          );
        })}
      </svg>

      {/* Overlay de calibração — dev-only (tree-shake em produção via import.meta.env.DEV). */}
      {import.meta.env.DEV && debug && <BodyMapDebug side={side} />}
    </div>
  );
}
