import { useState } from "react";

// PDF do Ernâni, tela 23: "Como foi o esforço?" de 1 a 10, ao concluir o treino. Informação para a equipe.
export const EFFORT_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export default function EffortPicker({ onPick }: { onPick: (effort: number) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const choose = (n: number) => {
    if (picked !== null) return; // uma resposta por treino
    setPicked(n);
    onPick(n);
  };
  return (
    <div className="bg-card rounded-2xl p-4 mb-4 text-left" data-testid="effort-picker">
      <p className="text-sm font-semibold text-foreground">Como foi o esforço?</p>
      <p className="text-[11px] text-muted-foreground mb-3">Sua equipe usa isso para ajustar a carga.</p>
      <div role="radiogroup" aria-label="Esforço percebido de 1 a 10" className="grid grid-cols-10 gap-1">
        {EFFORT_VALUES.map((n) => (
          <button
            key={n} role="radio" aria-checked={picked === n} aria-label={`Esforço ${n}`} onClick={() => choose(n)} disabled={picked !== null && picked !== n}
            className={`h-8 rounded-md text-[11px] font-semibold transition-colors ${picked === n ? "gradient-orange text-primary-foreground" : "bg-muted text-muted-foreground disabled:opacity-40"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground"><span>muito leve</span><span>máximo</span></div>
      {picked !== null && <p className="mt-2 text-[11px] text-primary font-medium">Anotado: {picked} de 10. Obrigado!</p>}
    </div>
  );
}
