import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, User, Target, Stethoscope, Bell as BellIcon, Shield, LogOut, Settings, Camera, Zap, Route } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-context";
import { useMe } from "@/hooks/useMe";
import { Skeleton } from "@/components/ui/skeleton";
import { getLatestAdherenceState, listMyCareTeam } from "@/lib/api";
import { careTeamLabel } from "@/lib/careTeam";
import { tracker } from "@/lib/eventTracker";
import BottomNav from "@/components/BottomNav";
import NoPrescriptionYet, {
  PROFESSIONAL_UNAVAILABLE_TITLE,
  PROFESSIONAL_UNAVAILABLE_MESSAGE,
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

  // Equipe responsável REAL (WP-APP-4 item 2) — ver listMyCareTeam (lib/api/chat.ts) para por que
  // o caminho é o roster do canal e não o join direto (a RLS de `professionals` fecha para ela).
  const careTeamQuery = useQuery({ queryKey: ["careTeam"], queryFn: listMyCareTeam });
  const professionalLabel = careTeamQuery.data ? careTeamLabel(careTeamQuery.data) : null;

  useEffect(() => { tracker.track('profile_viewed'); }, []);

  // WP-HARDENING B1: logout de produto. signOut já limpa o cache (queryClient.clear()); navega ao login.
  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  const startedAt = me.startDate ? formatMonthYear(me.startDate) : null;

  const menuItems = [
    { icon: Settings, label: "Configurações", value: "" },
    { icon: BellIcon, label: "Notificações", value: "" },
    { icon: Shield, label: "Privacidade", value: "" },
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
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full bg-card flex items-center justify-center border-2 border-primary">
              <User size={40} className="text-muted-foreground" />
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full gradient-orange flex items-center justify-center shadow-orange">
              <Camera size={14} className="text-primary-foreground" />
            </button>
          </div>
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
          <button className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border">
            <Target size={18} className="text-primary" />
            <span className="text-sm text-foreground flex-1 text-left">Meu objetivo</span>
            {me.goal && <span className="text-xs text-muted-foreground max-w-[140px] truncate">{me.goal}</span>}
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>

          {/* PROFISSIONAL RESPONSÁVEL — nome REAL (WP-APP-4 item 2).
              Substituiu "Dra. Camila Rocha" (mockData.ts:6), que não é ninguém: uma profissional
              inventada, apresentada à paciente como a pessoa que cuida dela. E o app já se
              contradizia sozinho — a tela de compartilhar exibia "Dra. Juliana Santiago" para o
              MESMO campo. Três estados, como no resto do app:
                · carregando -> skeleton (nunca afirmar ausência antes de a leitura resolver);
                · falhou     -> diz que falhou e oferece tentar de novo (falha ≠ "não tem");
                · resolveu sem ninguém -> "ainda não disponível", NUNCA "não tem profissional":
                  o canal de onde o nome sai é criado pelo PROFISSIONAL, não por ela, então
                  paciente nova com vínculo real cai aqui. Ver PROFESSIONAL_UNAVAILABLE_*. */}
          {careTeamQuery.isPending ? (
            <div className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Stethoscope size={18} className="text-primary" />
              <span className="text-sm text-foreground flex-1 text-left">Profissional responsável</span>
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          ) : careTeamQuery.isError ? (
            <div className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Stethoscope size={18} className="text-muted-foreground" />
              <span className="text-xs text-red-400 flex-1 text-left">Não foi possível carregar seu profissional.</span>
              <button onClick={() => careTeamQuery.refetch()} className="text-[11px] font-semibold text-primary whitespace-nowrap">
                Tentar novamente
              </button>
            </div>
          ) : professionalLabel ? (
            <button className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Stethoscope size={18} className="text-primary" />
              <span className="text-sm text-foreground flex-1 text-left">Profissional responsável</span>
              <span className="text-xs text-muted-foreground max-w-[140px] truncate">{professionalLabel}</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ) : (
            <div className="p-3 border-b border-border">
              <NoPrescriptionYet
                title={PROFESSIONAL_UNAVAILABLE_TITLE}
                message={PROFESSIONAL_UNAVAILABLE_MESSAGE}
                icon={Stethoscope}
                variant="row"
              />
            </div>
          )}

          {menuItems.map((item, i) => (
            <button key={i} className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0">
              <item.icon size={18} className="text-primary" />
              <span className="text-sm text-foreground flex-1 text-left">{item.label}</span>
              {item.value && <span className="text-xs text-muted-foreground max-w-[140px] truncate">{item.value}</span>}
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
