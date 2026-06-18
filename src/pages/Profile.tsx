import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, User, Target, Stethoscope, Bell as BellIcon, Shield, LogOut, Settings, Camera, Zap, Route } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { patient } from "@/data/mockData";
import { useMe } from "@/hooks/useMe";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdherenceState } from "@/lib/adherenceEngine";
import { tracker } from "@/lib/eventTracker";
import BottomNav from "@/components/BottomNav";

const phaseLabels: Record<string, string> = {
  inicio: 'Início',
  constancia_inicial: 'Constância inicial',
  acompanhamento_ativo: 'Acompanhamento ativo',
  revisao_progresso: 'Revisão de progresso',
  manutencao: 'Manutenção',
};

export default function Profile() {
  const navigate = useNavigate();
  const state = getAdherenceState();
  const { me, isLoading: meLoading } = useMe();

  useEffect(() => { tracker.track('profile_viewed'); }, []);

  const menuItems = [
    { icon: Target, label: "Meu objetivo", value: me.goal },
    { icon: Stethoscope, label: "Profissional responsável", value: patient.professional },
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
          <p className="text-xs text-muted-foreground">Paciente desde {new Date(patient.startDate).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
        </motion.div>

        {/* VRI + Journey summary */}
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

        {/* Weight stats */}
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
          {menuItems.map((item, i) => (
            <button key={i} className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0">
              <item.icon size={18} className="text-primary" />
              <span className="text-sm text-foreground flex-1 text-left">{item.label}</span>
              {item.value && <span className="text-xs text-muted-foreground max-w-[140px] truncate">{item.value}</span>}
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </motion.div>

        <button onClick={() => navigate("/")} className="w-full flex items-center justify-center gap-2 py-3 text-destructive text-sm font-medium">
          <LogOut size={16} />
          Sair
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
