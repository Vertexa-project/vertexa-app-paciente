import { useEffect } from "react";
import { motion } from "framer-motion";
// Settings e Shield saíram junto com os itens "Configurações" e "Privacidade" (WP-APP-6 3.3).
import { ArrowLeft, ChevronRight, Target, Stethoscope, Bell as BellIcon, LogOut, Zap, Route } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-context";
import { useMe } from "@/hooks/useMe";
import { Skeleton } from "@/components/ui/skeleton";
import { getLatestAdherenceState, getMyCareTeam } from "@/lib/api";
import { careTeamDisplayName } from "@/lib/careTeam";
import { DISCIPLINE_NOT_INFORMED, professionalDisciplineLabel } from "@/lib/chatTeam";
import { tracker } from "@/lib/eventTracker";
import { OwnAvatarControl } from "@/components/avatar/OwnAvatarControl";
import { ProfilePhoto } from "@/components/avatar/ProfilePhoto";
import BottomNav from "@/components/BottomNav";
import NoPrescriptionYet, {
  NO_ACTIVE_LINK_TITLE,
  NO_ACTIVE_LINK_MESSAGE,
} from "@/components/NoPrescriptionYet";

const phaseLabels: Record<string, string> = {
  inicio: 'Início',
  constancia_inicial: 'Constância inicial',
  acompanhamento_ativo: 'Acompanhamento ativo',
  revisao_progresso: 'Revisão de progresso',
  manutencao: 'Manutenção',
};

const MONTH_YEAR = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

/** `patients.start_date` é DATE (YYYY-MM-DD): parse manual, sem passar por UTC (que vira o mês). */
function formatMonthYear(isoDate: string): string | null {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  return MONTH_YEAR.format(new Date(y, m - 1, d));
}

export default function Profile() {
  const navigate = useNavigate();
  const { me, isLoading: meLoading } = useMe();
  const { signOut } = useAuth();

  // VRI/sequência/fase: MESMA fonte e MESMA query key da Home (["adherence"] -> último snapshot
  // persistido, escrito pelo servidor). Antes esta tela chamava `getAdherenceState()` SEM ARGUMENTO,
  // o que cai no DEFAULT_CONFIG do motor — 18 dias de sequência, 3 treinos na semana, peso recente,
  // plano visto — e renderizava o resultado (95%) como se fosse o índice DELA. Não era de ninguém:
  // é a configuração de exemplo do módulo, idêntica para toda paciente e imóvel a qualquer registro.
  // Pior, divergia da Home na MESMA sessão, que já lia o snapshot real. Agora é uma fonte só.
  const adherenceQuery = useQuery({ queryKey: ["adherence"], queryFn: getLatestAdherenceState });
  const state = adherenceQuery.data ?? null;

  // Equipe clínica REAL (WP-09B2) — RPC get_my_care_team, independente de chat/canal.
  const careTeamQuery = useQuery({ queryKey: ["careTeam"], queryFn: getMyCareTeam });
  const careTeam = careTeamQuery.data ?? [];

  useEffect(() => { tracker.track('profile_viewed'); }, []);

  // WP-HARDENING B1: logout de produto. signOut já limpa o cache (queryClient.clear()); navega ao login.
  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  const startedAt = me.startDate ? formatMonthYear(me.startDate) : null;

  // WP-APP-6 item 3.3 — "ou levam a algum lugar, ou deixam de parecer que levam".
  // A lista genérica sobrou com UM item, e ele leva a algum lugar de verdade. Os outros três
  // viraram tratamento próprio (ver o card do menu abaixo). O que saiu, e por quê:
  //
  //  · "Configurações" — REMOVIDO. Não existe rota, não existe tela, não existe tabela de
  //    preferências do paciente (varri App.tsx e o schema). Não é funcionalidade esperando
  //    dado: é rótulo sem objeto. O selo "Em breve" também não cabe — neste repo ele é usado
  //    sempre sobre algo CONSTRUÍDO e desligado (WorkoutGuide, Achievements); aqui prometeria
  //    uma tela que ninguém especificou. A única configuração que de fato existe nesta tela —
  //    sair da conta — já está no botão do rodapé.
  //
  //  · "Privacidade" — REMOVIDO, por motivo diferente. Numa lista de perfil de app de saúde,
  //    "Privacidade — Em breve" lê-se como "seus controles de privacidade ainda não existem",
  //    e o app NÃO TEM COMO SABER ISSO: a clínica pode ter consentimentos registrados em
  //    `media_consents` (a paciente inclusive já PODE lê-los e revogá-los pela RPC
  //    media_consent_revoke); este app é que nunca leu essa tabela. Remover não afirma nada.
  //    Construir a tela seria inventar tela nova, o que o WP proíbe explicitamente.
  const menuItems = [
    { icon: BellIcon, label: "Notificações", path: "/notifications" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Perfil</h1>
        </div>

        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center mb-6">
          {me.profileId ? (
            <OwnAvatarControl
              profileId={me.profileId}
              name={me.fullName}
              avatarPath={me.avatarPath ?? null}
              legacyUrl={me.avatar || null}
            />
          ) : (
            <div className="mb-3">
              <ProfilePhoto name={me.fullName} className="h-24 w-24 border-2 border-primary text-lg" />
            </div>
          )}
          <h2 className="text-lg font-display font-bold text-foreground">{meLoading ? <Skeleton className="h-6 w-44 rounded" /> : me.fullName}</h2>
          {/* "Paciente desde": `patients.start_date` REAL. Antes vinha de `patient.startDate`
              (mockData.ts:8 — 2025-01-15), a mesma data de início para toda paciente do app.
              Sem data no cadastro a linha simplesmente não aparece: a ausência é honesta, um
              mês inventado não. */}
          {meLoading ? (
            <Skeleton className="h-3 w-40 rounded mt-1" />
          ) : startedAt ? (
            <p className="text-xs text-muted-foreground">Paciente desde {startedAt}</p>
          ) : null}
        </motion.div>

        {/* VRI + Journey summary — SÓ com snapshot real. Sem snapshot (paciente que ainda não
            registrou nada) o bloco não é renderizado: não há índice ainda, e mostrar um número
            qualquer para preencher o espaço é exatamente o que este WP está removendo. */}
        {adherenceQuery.isPending ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mb-5">
            {[0, 1, 2].map((i) => <div key={i} className="h-[62px] bg-card rounded-xl animate-pulse" />)}
          </motion.div>
        ) : state ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-card rounded-xl p-3 text-center">
              <p className="text-lg font-display font-bold text-primary">{state.score}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">VRI</p>
            </div>
            <div className="bg-card rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Zap size={14} className="text-warning" />
                <p className="text-lg font-display font-bold text-foreground">{state.streak}</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sequência</p>
            </div>
            <div className="bg-card rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Route size={14} className="text-success" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{phaseLabels[state.journeyPhase]}</p>
            </div>
          </motion.div>
        ) : null}

        {/* Weight stats — já eram reais (patients.start_weight/current_weight/target_weight via
            useMe). Sem valor no cadastro mostram "--", que é a ausência, não um número inventado. */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Peso atual", value: me.currentWeight != null ? `${me.currentWeight}kg` : "--" },
            { label: "Eliminado", value: me.startWeight != null && me.currentWeight != null ? `-${(me.startWeight - me.currentWeight).toFixed(1)}kg` : "--" },
            { label: "Meta", value: me.targetWeight != null ? `${me.targetWeight}kg` : "--" },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-3 text-center">
              <p className="text-lg font-display font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Menu */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl overflow-hidden shadow-card mb-6">
          {/* MEU OBJETIVO — vira LINHA, não botão (WP-APP-6 item 3.3).
              Exibe dado REAL (patients.goal, via useMe) e é o único dos quatro que exibe algo —
              por isso não sai da lista. Mas não leva a lugar nenhum, e não pode levar: a policy
              `patients_update` é `is_clinic_admin(clinic_id) OR is_common_professional_of_patient(id)`
              — `is_self_patient` NÃO aparece nela, e nenhuma das 35 RPCs de `public` escreve
              `patients.goal` para a paciente. O objetivo é conduta definida pela clínica, e
              habilitar edição exigiria MIGRATION: bloqueio, não caminho.
              Vira <div> e PERDE o ChevronRight — a seta sozinha continuaria prometendo
              navegação. Mesmo padrão dos estados sem ação logo abaixo, e a regra está escrita
              em ComingSoonLock.tsx ("não interativo de propósito") e em NoPrescriptionYet.tsx
              ("botão que não faz nada é exatamente o que este WP está removendo").
              Sem goal no cadastro a linha inteira some, como "Paciente desde" acima: rótulo
              sozinho não é informação. */}
          {me.goal && (
            <div className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Target size={18} className="text-primary" />
              <span className="text-sm text-foreground flex-1 text-left">Meu objetivo</span>
              <span className="text-xs text-muted-foreground max-w-[140px] truncate">{me.goal}</span>
            </div>
          )}

          {/* MINHA EQUIPE — RPC get_my_care_team (WP-09B2).
              Independente de canal. Multiprofissional: 0 / 1 / N membros, todos visíveis.
              countMyActiveProfessionalLinks saiu daqui: era workaround de "tem vínculo mas
              o nome depende do chat". A RPC já devolve a equipe clínica. */}
          {careTeamQuery.isPending ? (
            <div className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Stethoscope size={18} className="text-primary" />
              <span className="text-sm text-foreground flex-1 text-left">Minha equipe</span>
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          ) : careTeamQuery.isError ? (
            <div className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Stethoscope size={18} className="text-muted-foreground" />
              <span className="text-xs text-red-400 flex-1 text-left">Não foi possível carregar sua equipe.</span>
              <button onClick={() => careTeamQuery.refetch()} className="text-[11px] font-semibold text-primary whitespace-nowrap">
                Tentar novamente
              </button>
            </div>
          ) : careTeam.length > 0 ? (
            <div className="border-b border-border">
              <div className="w-full flex items-center gap-3 px-4 pt-3.5 pb-2">
                <Stethoscope size={18} className="text-primary" />
                <span className="text-sm text-foreground flex-1 text-left">Minha equipe</span>
              </div>
              <ul className="px-4 pb-3.5 space-y-3">
                {careTeam.map((pro) => {
                  const name = careTeamDisplayName(pro);
                  const qualification = professionalDisciplineLabel(pro) ?? DISCIPLINE_NOT_INFORMED;
                  return (
                    <li key={pro.professionalId} className="flex items-center gap-3">
                      <ProfilePhoto
                        name={name}
                        avatarPath={pro.avatarPath}
                        legacyUrl={pro.avatarUrl}
                        className="h-9 w-9"
                        alt={name}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">{qualification}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="p-3 border-b border-border">
              <NoPrescriptionYet
                title={NO_ACTIVE_LINK_TITLE}
                message={NO_ACTIVE_LINK_MESSAGE}
                icon={Stethoscope}
                variant="row"
              />
            </div>
          )}

          {/* NOTIFICAÇÕES — o único dos quatro que já tinha destino: /notifications existe
              (App.tsx), lê dado real e trata os quatro estados. Aqui a seta deixa de mentir
              porque agora ela leva mesmo. */}
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0"
            >
              <item.icon size={18} className="text-primary" />
              <span className="text-sm text-foreground flex-1 text-left">{item.label}</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </motion.div>

        <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-3 text-destructive text-sm font-medium">
          <LogOut size={16} />
          Sair
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
