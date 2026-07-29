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
 *
 * QUEM AFIRMA É O TEXTO, NÃO O COMPONENTE: a casca visual (borda tracejada, tom apagado, sem
 * ação) serve a qualquer ausência honesta. O bloco do profissional responsável usa esta mesma
 * casca para dizer "ainda não disponível" — que é uma afirmação DIFERENTE e mais fraca do que
 * "ainda não prescrito". Ao reusar aqui, escreva o texto que você pode PROVAR (ver
 * PROFESSIONAL_UNAVAILABLE_MESSAGE no fim do arquivo, e o porquê).
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

/**
 * PROFISSIONAL RESPONSÁVEL — "ainda não disponível", que NÃO é "não existe".
 *
 * Substituiu "Dra. Camila Rocha" (mockData.ts), nome de uma profissional que não existe e que
 * nunca atendeu ninguém (WP-APP-4 item 2).
 *
 * ⚠️ ESTE TEXTO NÃO AFIRMA AUSÊNCIA, E NÃO PODE VOLTAR A AFIRMAR. A primeira versão dizia
 * "Profissional ainda não vinculado" — uma afirmação sobre o cadastro dela, e o app NÃO TEM
 * COMO SABER ISSO. A fonte do nome é a RPC `channel_professionals`, que depende de existir um
 * `chat_channels` da paciente; e o canal é criado por `get_or_create_channel`, que o app do
 * PACIENTE nunca chama (confira: a função não aparece em nenhum ponto de src/). Quem o cria é
 * o profissional, ao abrir a conversa no painel. Ou seja: uma paciente NOVA, com vínculo ativo
 * de verdade, cai exatamente aqui enquanto ninguém tiver aberto o chat dela — e leria que não
 * tem profissional. Falso, e cruel de ler.
 *
 * O que o app sabe com honestidade é só isto: o nome não está disponível agora. É o que o
 * texto diz, e ele nega explicitamente a inferência errada.
 */
/**
 * ÍNDICE VRI — "ainda não há o que calcular" (WP-APP-6 item 3.2).
 *
 * TERCEIRO caso, distinto dos outros dois, e é por isso que o texto é próprio:
 *  · não é ComingSoonLock — a funcionalidade EXISTE e roda (a RPC `recompute_adherence`
 *    escreve snapshot real; há um em produção). "Em breve" seria falso ao contrário.
 *  · não é "ainda não prescrito" — não falta ninguém publicar nada.
 * Reusa esta casca pela regra do topo do arquivo: quem afirma é o TEXTO.
 *
 * ⚠️ O TEXTO NÃO ATRIBUI CULPA, DE PROPÓSITO. `getLatestAdherenceState` devolve null em DUAS
 * situações que o app não distingue: não há linha em `adherence_snapshots`, ou o `patients.id`
 * dela não resolveu (adherence.ts:24). Dizer "registre seus hábitos" mandaria a segunda
 * paciente consertar algo que não está com ela. "Assim que houver registros" enuncia a
 * condição sem apontar o dedo.
 */
export const VRI_NOT_AVAILABLE_TITLE = "Índice VRI ainda não disponível";
export const VRI_NOT_AVAILABLE_MESSAGE =
  "Seu índice aparece assim que houver registros para calcular.";

/**
 * AS DUAS AUSÊNCIAS DO PROFISSIONAL, agora separadas (WP-APP-7 item 2.4).
 *
 * Até aqui havia UM texto para duas realidades muito diferentes, porque o app não sabia qual
 * era qual. Agora ele lê `professional_patient_links` (a paciente tem esse direito por
 * `ppl_select` / `is_self_patient`) e sabe:
 *
 *  · LINKED_NAME_UNAVAILABLE — ela TEM vínculo ativo, e o nome não chega. Causa real: o nome
 *    vem do roster do canal, e o canal é criado pelo profissional. NÃO PROMETE que o nome vai
 *    aparecer, e isso é deliberado: um vínculo EXTERNO (`is_external = true`) é excluído do
 *    roster de propósito e para sempre — `get_or_create_channel` não o insere e DELETA se
 *    entrar. Prometer chegada seria criar uma espera que nunca termina.
 *
 *  · NO_ACTIVE_LINK — não há vínculo ativo NENHUM no cadastro dela. Esta é a única situação
 *    em que afirmar ausência é honesto, porque o app leu o cadastro e viu.
 *    ⚠️ Este texto DIZ "vinculado" de propósito, e não contradiz a regra do
 *    PROFESSIONAL_UNAVAILABLE_* abaixo: lá o app não sabia e por isso não podia afirmar;
 *    aqui ele sabe. A regra nunca foi "não fale de vínculo", foi "não afirme o que não sabe".
 *
 * O PREDICADO é `coalesce(status,'active') = 'active'`, SEM filtrar `is_external` — e essa
 * escolha tem consequência. O filtro do roster (que também exclui externo) faria a paciente
 * com APENAS vínculo externo ler "nenhum profissional vinculado", o que é falso: ela tem uma
 * nutricionista de verdade. Em produção hoje ninguém está nesse estado (a única linha externa
 * é da Sofia, que também tem uma interna), mas o estado é construível, e errar ali seria
 * negar o profissional dela na cara dela.
 */
export const LINKED_NAME_UNAVAILABLE_TITLE = "Nome do profissional não disponível aqui";
export const LINKED_NAME_UNAVAILABLE_MESSAGE =
  "Você tem profissional vinculado ao seu cadastro, mas o nome não aparece nesta tela. " +
  "Em caso de dúvida, fale com sua clínica.";

export const NO_ACTIVE_LINK_TITLE = "Nenhum profissional vinculado ao seu cadastro";
export const NO_ACTIVE_LINK_MESSAGE =
  "Não encontramos vínculo ativo no seu cadastro. Fale com sua clínica para ser vinculada ao " +
  "seu profissional.";

export const PROFESSIONAL_UNAVAILABLE_TITLE = "Profissional responsável ainda não disponível";
export const PROFESSIONAL_UNAVAILABLE_MESSAGE =
  "Ainda não conseguimos mostrar o nome aqui. Isso não quer dizer que você não tenha um " +
  "profissional responsável — em caso de dúvida, fale com sua clínica.";
