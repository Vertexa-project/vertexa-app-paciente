import { Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * CADEADO "EM BREVE" — funcionalidade que existe no produto mas AINDA NÃO TEM DADO REAL.
 *
 * POR QUE ISTO EXISTE (WP-APP-1): mostrar número inventado é pior do que não mostrar nada.
 * Um "6.420 passos" que nunca muda faz a paciente concluir uma de duas coisas — ou que o app
 * está quebrado, ou que o número é verdade. As duas são ruins, e a segunda é pior. O cadeado
 * diz a verdade: a funcionalidade existe, o dado ainda não.
 *
 * REGRAS DE USO:
 *  · NÃO exibe valor nenhum — nem zero, nem placeholder, nem "--". O número não entra aqui.
 *  · NÃO é clicável e NÃO navega. É um bloco informativo, e é por isso que é <div> e não
 *    <button>: elemento não interativo não recebe foco nem promete ação que não existe.
 *  · O texto do `reason` tem de ser honesto e curto — dizer POR QUE não há dado, não pedir
 *    desculpa nem prometer data.
 *
 * Reutilizável: qualquer outra métrica sem lastro real (ver a varredura no retorno do WP-APP-1)
 * deve usar ESTE componente em vez de inventar outro padrão visual.
 */
interface ComingSoonLockProps {
  /** Nome da funcionalidade, como a paciente a conhece. Ex.: "Passos". */
  title: string;
  /** Por que ainda não há dado. Curto, uma frase, sem promessa de prazo. */
  reason: string;
  /** Ícone da funcionalidade (o mesmo que ela teria se estivesse ativa). */
  icon?: LucideIcon;
  /** `row` = linha de lista (Metas do dia). `card` = bloco próprio (Hábitos). */
  variant?: "card" | "row";
  className?: string;
}

export default function ComingSoonLock({
  title,
  reason,
  icon: Icon,
  variant = "card",
  className = "",
}: ComingSoonLockProps) {
  const isRow = variant === "row";

  return (
    <div
      // Não interativo de propósito: sem onClick, sem tabIndex, sem role="button".
      aria-label={`${title} — em breve. ${reason}`}
      className={[
        "flex items-center gap-3 border border-dashed border-border bg-muted/30",
        isRow ? "p-3.5 rounded-xl" : "p-5 rounded-2xl",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "shrink-0 rounded-xl bg-muted flex items-center justify-center",
          isRow ? "w-10 h-10" : "w-11 h-11",
        ].join(" ")}
        aria-hidden
      >
        {Icon ? (
          <Icon size={isRow ? 20 : 22} className="text-muted-foreground/60" />
        ) : (
          <Lock size={isRow ? 18 : 20} className="text-muted-foreground/60" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
            <Lock size={10} className="text-muted-foreground/70" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              Em breve
            </span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground/70 mt-0.5">{reason}</p>
      </div>
    </div>
  );
}

/**
 * Texto ÚNICO do cadeado de passos — compartilhado pela Home e por Hábitos para as duas telas
 * não divergirem. Honesto sobre a causa: falta a integração, não é bug.
 */
export const STEPS_LOCK_REASON =
  "Depende de integração com aparelho ou relógio, ainda não disponível.";
