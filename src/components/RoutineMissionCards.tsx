import FirstWeekMission from "@/components/FirstWeekMission";
import RoutineTaskCard from "@/components/RoutineTaskCard";

/** Cartões das automações A4 (rotina) e A5 (missão da 1ª semana) no Início. Somem sozinhos quando a clínica não ligou. */
export default function RoutineMissionCards() {
  return (
    <>
      <FirstWeekMission />
      <RoutineTaskCard />
    </>
  );
}
