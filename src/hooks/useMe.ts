import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPatient } from "@/lib/api";
import type { PatientWithProfile } from "@/lib/api";

// Identity shape the screens already expect (mirrors the mock `patient` identity fields).
export interface Identity {
  name: string; // first name, e.g. "Mariana"
  fullName: string; // "Mariana Albuquerque"
  avatar: string; // avatar_url or ""
  goal: string;
  currentWeight: number | null;
  startWeight: number | null;
  targetWeight: number | null;
  /**
   * `patients.start_date` (ISO, YYYY-MM-DD) — início do acompanhamento. Anulável de propósito:
   * o Perfil exibia "Paciente desde <mês/ano>" a partir de `patient.startDate` do mock
   * (2025-01-15, igual para todo mundo). Sem data real a linha não é exibida (WP-APP-4 item 2).
   */
  startDate: string | null;
}

// Neutral fallback so an error/empty never crashes a screen.
const NEUTRAL: Identity = {
  name: "Paciente",
  fullName: "Paciente",
  avatar: "",
  goal: "",
  currentWeight: null,
  startWeight: null,
  targetWeight: null,
  startDate: null,
};

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function adapt(p: PatientWithProfile): Identity {
  const fullName = (p.profile?.full_name ?? "").trim();
  return {
    name: fullName.split(/\s+/)[0] || "Paciente",
    fullName: fullName || "Paciente",
    avatar: p.profile?.avatar_url ?? "",
    goal: p.goal ?? "",
    currentWeight: toNumber(p.current_weight),
    startWeight: toNumber(p.start_weight),
    targetWeight: toNumber(p.target_weight),
    // `getPatient` já faz `select *` em patients — a coluna vem no payload, não há leitura nova.
    startDate: p.start_date ?? null,
  };
}

/**
 * Real patient identity (demo: Mariana) via getPatient(). Only identity fields
 * (name, goal, weights, avatar); the rest of the screens stay on mock for now (4c-3a).
 */
export function useMe() {
  const query = useQuery({ queryKey: ["me"], queryFn: getPatient });

  useEffect(() => {
    if (query.isError && import.meta.env.DEV) {
      console.warn("[VERTEXA useMe] failed to load patient identity", query.error);
    }
  }, [query.isError, query.error]);

  const me: Identity = query.data ? adapt(query.data) : NEUTRAL;
  return { me, isLoading: query.isLoading, isError: query.isError };
}