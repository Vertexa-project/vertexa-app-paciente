import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { allOptions, type MealOption } from "@/lib/mealOptions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: { name: string; items: string[]; calories: number | null };
  alternatives: MealOption[];
  /** Opção em uso hoje (1 = a refeição original). */
  current: number;
  pending?: boolean;
  onUse: (optionIndex: number) => void;
}

/** "Trocar sem sair do plano": a opção atual destacada, alternativas com kcal e "Usar opção selecionada" (PDF do Ernâni, tela 19). */
export default function MealOptionsSheet({ open, onOpenChange, meal, alternatives, current, pending, onUse }: Props) {
  const [picked, setPicked] = useState<number>(current);
  const options = allOptions(meal, alternatives);
  return (
    <Sheet open={open} onOpenChange={(o) => { if (o) setPicked(current); onOpenChange(o); }}>
      <SheetContent side="bottom" className="bg-card border-border rounded-t-3xl max-w-[430px] mx-auto pb-8">
        <SheetTitle className="font-display text-base text-foreground">{meal.name} · opções</SheetTitle>
        <SheetDescription className="text-xs">Troque por qualquer opção com valor parecido.</SheetDescription>
        <div className="flex flex-col gap-2 mt-3" role="radiogroup" aria-label="Opções da refeição">
          {options.map((o) => {
            const selected = picked === o.index;
            return (
              <button
                key={o.index}
                role="radio"
                aria-checked={selected}
                onClick={() => setPicked(o.index)}
                className={`text-left rounded-xl p-3 border transition-colors ${selected ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Opção {o.index}{o.index === current ? " · atual" : ""}</span>
                  {o.calories != null && <span className="text-[11px] text-muted-foreground">{o.calories} kcal</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{o.items.join(" · ")}</p>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onUse(picked)}
          disabled={pending}
          className="w-full mt-4 py-3 rounded-xl gradient-orange text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          Usar opção selecionada
        </button>
      </SheetContent>
    </Sheet>
  );
}
