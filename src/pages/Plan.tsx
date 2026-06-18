import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Clock, Pill, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mealPlan, supplements } from "@/data/mockData";
import { useQuery } from "@tanstack/react-query";
import { getMyNutritionPlan } from "@/lib/api";
import { tracker } from "@/lib/eventTracker";
import BottomNav from "@/components/BottomNav";

type Tab = "alimentar" | "treino" | "suplementos" | "orientacoes";

export default function Plan() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("alimentar");
  const [, setExpandedWorkout] = useState<number | null>(null);

  useEffect(() => { tracker.track('plan_viewed'); }, []);

  // 4c-3b: real nutrition plan (web-authored) with graceful fallback to mock so the screen never breaks.
  const { data: nutritionPlan, isError: planError } = useQuery({ queryKey: ["nutritionPlan"], queryFn: getMyNutritionPlan });
  useEffect(() => {
    if (planError && import.meta.env.DEV) {
      console.warn("[VERTEXA Plan] failed to load real nutrition plan; using mock", planError);
    }
  }, [planError]);
  const usingRealMeals = !!(nutritionPlan && nutritionPlan.meals.length > 0);
  const meals = usingRealMeals ? nutritionPlan!.meals : mealPlan;
  const planTitle = usingRealMeals ? nutritionPlan!.title : "";

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === 'alimentar') tracker.track('meal_plan_viewed');
    if (t === 'treino') tracker.track('training_plan_viewed');
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "alimentar", label: "Alimentar" },
    { key: "treino", label: "Treino" },
    { key: "suplementos", label: "Suplem." },
    { key: "orientacoes", label: "Dicas" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-[430px] mx-auto px-5 pt-14">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Meu Plano</h1>
        </div>

        <div className="flex gap-2 mb-5 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                tab === t.key ? "gradient-orange text-primary-foreground shadow-orange" : "bg-card text-muted-foreground"
              }`}>{t.label}</button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "alimentar" && (
            <motion.div key="alimentar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              {planTitle && (
                <div className="flex items-center gap-2 mb-1 px-1">
                  <BookOpen size={16} className="text-primary" />
                  <span className="text-sm font-semibold text-foreground">{planTitle}</span>
                </div>
              )}
              {meals.map((meal, i) => (
                <div key={i} className={`bg-card rounded-xl p-4 ${meal.done ? "border border-success/20" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{meal.time}</span>
                      <span className="text-sm font-semibold text-foreground">{meal.name}</span>
                    </div>
                    {meal.done && <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center"><Check size={12} className="text-success-foreground" /></div>}
                  </div>
                  <div className="flex flex-col gap-0.5 ml-6">
                    {meal.items.map((item, j) => (<span key={j} className="text-xs text-muted-foreground">• {item}</span>))}
                  </div>
                  <div className="mt-2 ml-6 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{meal.calories} kcal</span>
                    <button className="text-[10px] text-primary font-medium">Ver opções</button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {tab === "treino" && (
            <motion.div key="treino" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
              <div className="bg-card rounded-xl p-4 border border-primary/20">
                <p className="text-sm font-semibold text-foreground mb-1">Guia de Treino Interativo</p>
                <p className="text-xs text-muted-foreground mb-3">Veja sua ficha completa, inicie o treino do dia e acompanhe seu progresso exercício por exercício.</p>
                <button onClick={() => navigate('/workout-guide')} className="w-full h-11 rounded-xl gradient-orange text-primary-foreground text-sm font-bold flex items-center justify-center gap-2">
                  Abrir meu treino
                </button>
              </div>
            </motion.div>
          )}

          {tab === "suplementos" && (
            <motion.div key="suplementos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              {supplements.map((s, i) => (
                <div key={i} className="bg-card rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">{s.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.dose} • {s.time}</p>
                  </div>
                  <Pill size={16} className="text-muted-foreground" />
                </div>
              ))}
            </motion.div>
          )}

          {tab === "orientacoes" && (
            <motion.div key="orientacoes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              {[
                { title: "Hidratação adequada", desc: "Beba pelo menos 2.5L de água por dia, distribuídos ao longo do dia." },
                { title: "Sono reparador", desc: "Durma entre 7-8 horas. Evite telas 1h antes de dormir." },
                { title: "Alimentação consciente", desc: "Coma devagar, mastigue bem e evite distrações durante as refeições." },
                { title: "Gerenciamento de estresse", desc: "Pratique 10 minutos de respiração ou meditação diariamente." },
              ].map((o, i) => (
                <div key={i} className="bg-card rounded-xl p-4 flex items-start gap-3">
                  <BookOpen size={18} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{o.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{o.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
