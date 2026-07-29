import { ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * ESTADO VAZIO HONESTO — o profissional AINDA NÃO PRESCREVEU.
 *
 * POR QUE ISTO EXISTE (WP-APP-2 2.1): as telas de plano alimentar e de treino caíam em
 * `src/data/mockData.ts` / `src/data/workoutData.ts` quando não havia plano real. O efeito
 * era colocar conduta NÃO PRESCRITA na frente da paciente — refeição, horário, caloria,
 * exercício, série e carga que nenhum profissional mandou fazer. Uma paciente não tem como
 * distinguir isso de prescrição de verdade. Isto aqui é o que aparece no lugar.
 *
 * NÃO CONFUNDIR COM ComingSoonLock:
 *  · ComingSoonLock = a FUNCIONALIDADE não existe ainda (passos, sono: falta integração).
 *  · NoPrescriptionYet = a funcionalidade existe e funciona; o que falta é o PROFISSIONAL
 *    publicar o conteúdo. Não é "em breve", é "ainda não prescrito" — e por isso não leva
 *    selo de "em breve" nem promessa de prazo.
 *
 * REGRAS DE USO:
 *  · NÃO exibe nenhum dado de plano — nem exemplo, nem prévia, nem placeholder numérico.
 *  · NÃO é clicável e NÃO navega (<div>, não <button>): não há ação que a paciente possa
 *    tomar aqui, e botão que não faz nada é exatamente o que este WP está removendo.
 *  · Use SOMENTE depois que a leitura resolveu. Enquanto carrega, mostre skeleton — este
 *    bloco afirma "não existe plano", e afirmar isso durante o carregamento seria mentir
 *    de novo, só que na direção contrária.
 */
interface NoPrescriptionYetProps {
  /** O que não foi prescrito, como a paciente chama. Ex.: "Plano alimentar". */
  title: string;
  /** Quem publica e o que acontece quando publicar. Curto, sem promessa de prazo. */
  message: string;
  icon?: LucideIcon;
  /** `row` = linha de lista (Metas do dia). `card` = bloco próprio (Plano, Treino). */
  variant?: "card" | "row";
  className?: string;
}

export default function NoPrescriptionYet({
  title,
  message,
  icon: Icon = ClipboardList,
  variant = "card",
  className = "",
}: NoPrescriptionYetProps) {
  const isRow = variant === "row";

  if (isRow) {
    return (
      <div
        aria-label={`${title}. ${message}`}
        className={[
          "flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-border bg-muted/30",
          className,
        ].join(" ")}
      >
        <div className="w-10 h-10 shrink-0 rounded-xl bg-muted flex items-center justify-center" aria-hidden>
          <Icon size={20} className="text-muted-foreground/60" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <p className="text-xs text-muted-foreground/70 mt-0.5">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label={`${title}. ${message}`}
      className={[
        "flex flex-col items-center gap-2 text-center p-6 rounded-2xl border border-dashed border-border bg-muted/30",
        className,
      ].join(" ")}
    >
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center" aria-hidden>
        <Icon size={22} className="text-muted-foreground/60" />
      </div>
      <p className="text-sm font-semibold text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/70 max-w-[280px] leading-relaxed">{message}</p>
    </div>
  );
}

/** Textos ÚNICOS — Home, Plano, Treino e Registros não podem divergir na mesma frase. */
export const NO_MEAL_PLAN_TITLE = "Plano alimentar ainda não prescrito";
export const NO_MEAL_PLAN_MESSAGE =
  "Seu nutricionista ainda não publicou seu plano. Assim que publicar, suas refeições aparecem aqui.";

export const NO_WORKOUT_PLAN_TITLE = "Treino ainda não prescrito";
export const NO_WORKOUT_PLAN_MESSAGE =
  "Seu profissional ainda não publicou sua ficha. Assim que publicar, seus treinos aparecem aqui.";
