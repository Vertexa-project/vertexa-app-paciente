import { useState } from "react";

import { useClinicBrand } from "@/hooks/useClinicBrand";
import { brandInitials } from "@/lib/clinicBrand";

/**
 * Identidade da clínica no app: logo (ou iniciais na cor da marca) + nome em destaque, com a Vertexa como
 * assinatura secundária. Sem clínica resolvida não renderiza nada (o app nunca inventa um nome).
 */
export default function ClinicBadge({ className = "", showSignature = true }: { className?: string; showSignature?: boolean }) {
  const { data: b } = useClinicBrand();
  const [broken, setBroken] = useState<string | null>(null);
  if (!b) return null;
  const showImg = Boolean(b.logoUrl) && broken !== b.logoUrl;
  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      {showImg ? (
        <img
          src={b.logoUrl as string}
          alt={`Logo de ${b.name}`}
          onError={() => setBroken(b.logoUrl)}
          className="w-9 h-9 rounded-lg bg-white object-contain shrink-0"
        />
      ) : (
        <span
          aria-hidden
          className="w-9 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0"
          style={b.color ? { backgroundColor: b.color } : undefined}
        >
          {brandInitials(b.name)}
        </span>
      )}
      <div className="min-w-0 leading-tight">
        <p className="text-sm font-bold text-foreground truncate">{b.name}</p>
        {showSignature && <p className="text-[10px] uppercase tracking-wider text-muted-foreground">via Vertexa</p>}
      </div>
    </div>
  );
}
