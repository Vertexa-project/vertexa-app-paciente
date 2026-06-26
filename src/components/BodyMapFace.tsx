import {
  FACE_VIEWBOX,
  RECOVERY_FILL,
  RECOVERY_LABEL_PT,
  RECOVERY_STROKE,
  ZONES_BY_SIDE,
  resolveZoneBlobs,
  type BodySide,
  type BodyZone,
} from "@/components/bodyMapZones";
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
 * Uma face do corpo: PNG oficial (object-contain) + overlay SVG das zonas no MESMO box.
 * Cada zona é um <g> clicável; os blobs são <path> pintados pelo token do status, sem filtro
 * na imagem (a anatomia continua visível através do fill-opacity).
 */
export default function BodyMapFace({
  side,
  imgSrc,
  statusByMuscle,
  onZoneTap,
  selectedMuscle,
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
              {resolveZoneBlobs(zone).map((blob, i) => (
                <g key={i} transform={blob.transform}>
                  {/* área de toque transparente (maior) — alvo confortável no mobile */}
                  <path d={blob.hitD} fill="transparent" style={{ pointerEvents: "all" }} />
                  {/* forma visível pintada pelo token do status */}
                  <path
                    d={blob.d}
                    className={`${RECOVERY_FILL[status]} ${RECOVERY_STROKE[status]} transition-colors duration-300`}
                    style={{
                      pointerEvents: "none",
                      fillOpacity: status === "neutral" ? 0.22 : 0.5,
                      strokeOpacity: isSelected ? 0.95 : 0.65,
                      strokeWidth: isSelected ? 1.4 : 0.7,
                    }}
                  />
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
