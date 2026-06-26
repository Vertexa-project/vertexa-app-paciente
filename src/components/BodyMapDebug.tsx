import { useEffect, useMemo, useRef, useState } from "react";
import {
  FACE_VIEWBOX,
  ZONES_BY_SIDE,
  resolveZonePaths,
  type BodySide,
} from "@/components/bodyMapZones";
import type { CanonicalMuscle } from "@/lib/api/types";

// BODYMAP_DEBUG_OVERLAY — overlay DEV-ONLY de calibração das zonas. Renderizado SOMENTE sob
// `import.meta.env.DEV && debug` (ver BodyMapFace), então some do bundle de produção (tree-shake).
// Mostra: grade de coords do viewBox, contorno de cada zona, centro + id, marcação de SOBREPOSIÇÃO
// entre zonas (pontos cobertos por 2+ grupos) e, ao tocar, as coords no viewBox + as zonas atingidas.

const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#f43f5e",
  "#84cc16", "#f59e0b", "#8b5cf6",
];

interface Instance {
  key: string;
  d: string;
  cx: number;
  cy: number;
  id: string;
  muscle: CanonicalMuscle;
  color: string;
}

export default function BodyMapDebug({ side }: { side: BodySide }) {
  const { w, h } = FACE_VIEWBOX[side];
  const svgRef = useRef<SVGSVGElement>(null);
  const elRefs = useRef<Array<{ el: SVGPathElement | null; muscle: CanonicalMuscle; id: string }>>([]);
  const [tap, setTap] = useState<{ x: number; y: number; hits: string[] } | null>(null);
  const [overlaps, setOverlaps] = useState<Array<{ x: number; y: number }>>([]);

  const instances = useMemo<Instance[]>(() => {
    const zones = ZONES_BY_SIDE[side];
    const out: Instance[] = [];
    zones.forEach((z, zi) => {
      resolveZonePaths(z).forEach((rp, i) => {
        out.push({
          key: `${z.id}-${i}`,
          d: rp.d,
          cx: rp.center.x,
          cy: rp.center.y,
          id: z.id,
          muscle: z.muscle,
          color: PALETTE[zi % PALETTE.length],
        });
      });
    });
    return out;
  }, [side]);

  elRefs.current = [];

  // Varre uma grade e marca pontos cobertos por 2+ MÚSCULOS distintos (sobreposição indevida).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    const els = elRefs.current.filter((r) => r.el);
    const found: Array<{ x: number; y: number }> = [];
    for (let y = 1; y < h; y += 2) {
      for (let x = 1; x < w; x += 2) {
        pt.x = x;
        pt.y = y;
        const muscles = new Set<string>();
        for (const r of els) {
          if (r.el!.isPointInFill(pt)) muscles.add(r.muscle);
          if (muscles.size >= 2) break;
        }
        if (muscles.size >= 2) found.push({ x, y });
      }
    }
    setOverlaps(found);
  }, [side, w, h, instances]);

  const handleTap = (e: React.PointerEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const loc = p.matrixTransform(ctm.inverse());
    const probe = svg.createSVGPoint();
    probe.x = loc.x;
    probe.y = loc.y;
    const hits: string[] = [];
    for (const r of elRefs.current) {
      if (r.el && r.el.isPointInFill(probe)) hits.push(`${r.id} → ${r.muscle}`);
    }
    // eslint-disable-next-line no-console
    console.log(
      `[bodymap-debug:${side}] tap @ viewBox (${loc.x.toFixed(1)}, ${loc.y.toFixed(1)}) | zonas: ${hits.join(", ") || "—"}`
    );
    setTap({ x: loc.x, y: loc.y, hits });
  };

  const gridX = Array.from({ length: Math.floor(w / 10) + 1 }, (_, i) => i * 10);
  const gridY = Array.from({ length: Math.floor(h / 10) + 1 }, (_, i) => i * 10);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full z-20"
      aria-hidden="true"
    >
      {/* camada de captura de toque (inspeção; não abre o sheet em modo debug) */}
      <rect x={0} y={0} width={w} height={h} fill="transparent" style={{ pointerEvents: "all" }} onPointerDown={handleTap} />

      {/* grade */}
      <g style={{ pointerEvents: "none" }} stroke="#ffffff" strokeWidth={0.1} opacity={0.35}>
        {gridX.map((x) => (
          <line key={`vx${x}`} x1={x} y1={0} x2={x} y2={h} />
        ))}
        {gridY.map((y) => (
          <line key={`hy${y}`} x1={0} y1={y} x2={w} y2={y} />
        ))}
      </g>
      <g style={{ pointerEvents: "none" }} fill="#ffffff" opacity={0.6} fontSize={2.4}>
        {gridX.map((x) => (
          <text key={`tx${x}`} x={x + 0.3} y={3}>{x}</text>
        ))}
        {gridY.map((y) => (
          <text key={`ty${y}`} x={0.3} y={y - 0.4}>{y}</text>
        ))}
      </g>

      {/* contornos das zonas + centro + id */}
      <g style={{ pointerEvents: "none" }}>
        {instances.map((inst, idx) => (
          <g key={inst.key}>
            <path
              ref={(el) => {
                elRefs.current[idx] = { el, muscle: inst.muscle, id: inst.id };
              }}
              d={inst.d}
              fill={inst.color}
              fillOpacity={0.12}
              stroke={inst.color}
              strokeWidth={0.5}
            />
            <circle cx={inst.cx} cy={inst.cy} r={0.8} fill={inst.color} />
            <text x={inst.cx + 1.2} y={inst.cy} fontSize={2} fill={inst.color}>
              {inst.id.replace(/^(front|back)-/, "")}
            </text>
          </g>
        ))}
      </g>

      {/* sobreposição indevida: pontos cobertos por 2+ grupos */}
      <g style={{ pointerEvents: "none" }} fill="#ff0000">
        {overlaps.map((o, i) => (
          <rect key={i} x={o.x - 0.3} y={o.y - 0.3} width={0.6} height={0.6} />
        ))}
      </g>

      {/* leitura do último toque */}
      {tap && (
        <g style={{ pointerEvents: "none" }}>
          <line x1={tap.x - 3} y1={tap.y} x2={tap.x + 3} y2={tap.y} stroke="#ffffff" strokeWidth={0.3} />
          <line x1={tap.x} y1={tap.y - 3} x2={tap.x} y2={tap.y + 3} stroke="#ffffff" strokeWidth={0.3} />
          <rect x={1} y={h - 9} width={64} height={8} fill="#000000" opacity={0.7} />
          <text x={2} y={h - 5.6} fontSize={2.6} fill="#ffffff">
            ({tap.x.toFixed(1)}, {tap.y.toFixed(1)})
          </text>
          <text x={2} y={h - 2.4} fontSize={2.2} fill={tap.hits.length > 1 ? "#ff6b6b" : "#9ae6b4"}>
            {tap.hits.join(" | ") || "fora de qualquer zona"}
          </text>
        </g>
      )}

      {/* contador de sobreposições */}
      {overlaps.length > 0 && (
        <text x={2} y={6} fontSize={2.6} fill="#ff6b6b" style={{ pointerEvents: "none" }}>
          ⚠ {overlaps.length} pts sobrepostos
        </text>
      )}
    </svg>
  );
}
