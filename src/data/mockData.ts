export const patient = {
  name: "Juliana",
  fullName: "Juliana Martins",
  avatar: "",
  goal: "Emagrecimento saudável",
  professional: "Dra. Camila Rocha",
  clinic: "Clínica Vértice",
  startDate: "2025-01-15",
  currentWeight: 68.4,
  startWeight: 74.2,
  targetWeight: 62,
};

export const dailyGoals = [
  { id: "water", label: "Água", icon: "💧", current: 1.8, target: 2.5, unit: "L", done: false },
  { id: "sleep", label: "Sono", icon: "🌙", current: 7, target: 8, unit: "h", done: false },
  { id: "steps", label: "Passos", icon: "👟", current: 6420, target: 8000, unit: "", done: false },
  { id: "meals", label: "Refeições", icon: "🥗", current: 3, target: 5, unit: "", done: false },
  { id: "workout", label: "Treino", icon: "🏋️", current: 0, target: 1, unit: "", done: false },
];

export const weeklyProgress = {
  score: 78,
  status: "bom" as const,
  days: [
    { day: "Seg", score: 90, done: true },
    { day: "Ter", score: 85, done: true },
    { day: "Qua", score: 70, done: true },
    { day: "Qui", score: 75, done: true },
    { day: "Sex", score: 60, done: false },
    { day: "Sáb", score: 0, done: false },
    { day: "Dom", score: 0, done: false },
  ],
};

export const weightHistory = [
  { date: "Jan", weight: 74.2 },
  { date: "Fev", weight: 72.8 },
  { date: "Mar", weight: 71.5 },
  { date: "Abr", weight: 70.1 },
  { date: "Mai", weight: 69.3 },
  { date: "Jun", weight: 68.4 },
];

export const mealPlan = [
  {
    time: "07:00",
    name: "Café da manhã",
    items: ["2 ovos mexidos", "1 fatia pão integral", "Café com leite desnatado", "1 fruta"],
    calories: 380,
    done: true,
  },
  {
    time: "10:00",
    name: "Lanche da manhã",
    items: ["1 iogurte natural", "1 colher de granola", "5 castanhas"],
    calories: 220,
    done: true,
  },
  {
    time: "12:30",
    name: "Almoço",
    items: ["150g frango grelhado", "Arroz integral", "Salada verde", "Legumes refogados"],
    calories: 520,
    done: true,
  },
  {
    time: "15:30",
    name: "Lanche da tarde",
    items: ["1 banana", "1 colher de pasta de amendoim"],
    calories: 200,
    done: false,
  },
  {
    time: "19:00",
    name: "Jantar",
    items: ["150g salmão", "Batata doce", "Brócolis no vapor"],
    calories: 450,
    done: false,
  },
];

export const workoutPlan = [
  {
    day: "Segunda",
    name: "Treino A — Superior",
    exercises: [
      { name: "Supino reto", sets: "4x12", load: "20kg" },
      { name: "Remada curvada", sets: "4x12", load: "18kg" },
      { name: "Desenvolvimento", sets: "3x12", load: "10kg" },
      { name: "Rosca direta", sets: "3x15", load: "8kg" },
      { name: "Tríceps corda", sets: "3x15", load: "12kg" },
    ],
    done: true,
    duration: "55min",
  },
  {
    day: "Terça",
    name: "Cardio HIIT",
    exercises: [
      { name: "Aquecimento", sets: "5min", load: "-" },
      { name: "Sprint", sets: "8x30s", load: "-" },
      { name: "Descanso ativo", sets: "8x60s", load: "-" },
      { name: "Alongamento", sets: "5min", load: "-" },
    ],
    done: true,
    duration: "30min",
  },
  {
    day: "Quarta",
    name: "Treino B — Inferior",
    exercises: [
      { name: "Agachamento livre", sets: "4x12", load: "30kg" },
      { name: "Leg press", sets: "4x15", load: "80kg" },
      { name: "Stiff", sets: "3x12", load: "20kg" },
      { name: "Cadeira extensora", sets: "3x15", load: "25kg" },
      { name: "Panturrilha", sets: "4x20", load: "30kg" },
    ],
    done: true,
    duration: "50min",
  },
  {
    day: "Quinta",
    name: "Treino C — Full Body",
    exercises: [
      { name: "Agachamento búlgaro", sets: "3x12", load: "10kg" },
      { name: "Supino inclinado", sets: "3x12", load: "16kg" },
      { name: "Remada unilateral", sets: "3x12", load: "14kg" },
      { name: "Elevação lateral", sets: "3x15", load: "5kg" },
      { name: "Prancha", sets: "3x45s", load: "-" },
    ],
    done: false,
    duration: "45min",
  },
  {
    day: "Sexta",
    name: "Cardio moderado",
    exercises: [
      { name: "Caminhada inclinada", sets: "30min", load: "-" },
      { name: "Alongamento geral", sets: "10min", load: "-" },
    ],
    done: false,
    duration: "40min",
  },
];

// (S3) O mock de suplementos foi REMOVIDO: a aba Suplem. lê a tabela `supplements` (autoria web,
// seed da Mariana na migration 20260702140000). Sem fallback mock de propósito — vazio real.

export const achievements = [
  { id: 1, title: "Primeira semana completa", icon: "🔥", date: "22 Jan", unlocked: true, description: "Completou 7 dias seguidos" },
  { id: 2, title: "10 treinos concluídos", icon: "🏆", date: "05 Fev", unlocked: true, description: "Atingiu 10 treinos registrados" },
  { id: 3, title: "Meta de água por 5 dias", icon: "💧", date: "12 Fev", unlocked: true, description: "Bebeu 2.5L por 5 dias seguidos" },
  { id: 4, title: "3kg eliminados", icon: "⚖️", date: "28 Fev", unlocked: true, description: "Perdeu 3kg desde o início" },
  { id: 5, title: "Mês consistente", icon: "📅", date: "15 Mar", unlocked: true, description: "Score acima de 70% por 30 dias" },
  { id: 6, title: "5kg eliminados", icon: "🎯", date: "10 Abr", unlocked: true, description: "Perdeu 5kg desde o início" },
  { id: 7, title: "50 treinos concluídos", icon: "💎", date: "", unlocked: false, description: "Faltam 8 treinos" },
  { id: 8, title: "Sequência de 30 dias", icon: "🔥", date: "", unlocked: false, description: "Faltam 12 dias" },
];

export const notifications = [
  { id: 1, type: "reminder", title: "Hora de beber água!", message: "Você está em 1.2L. Meta: 2.5L", time: "Agora", read: false },
  { id: 2, type: "motivation", title: "Você está arrasando! 🔥", message: "4 dias consecutivos com score acima de 80%", time: "2h atrás", read: false },
  { id: 3, type: "reminder", title: "Treino de hoje", message: "Treino C — Full Body às 18:00", time: "4h atrás", read: true },
  { id: 4, type: "achievement", title: "Nova conquista! 🏆", message: "Você completou 5kg eliminados", time: "Ontem", read: true },
  { id: 5, type: "reminder", title: "Registrar peso semanal", message: "É dia de registrar seu peso. Não esqueça!", time: "Ontem", read: true },
  { id: 6, type: "professional", title: "Mensagem da Dra. Camila", message: "Seu plano alimentar foi atualizado", time: "2 dias", read: true },
];

export const sosCategories = [
  { id: "travel", icon: "✈️", label: "Estou viajando", description: "Preciso adaptar minha rotina" },
  { id: "diet", icon: "🍔", label: "Dificuldade com dieta", description: "Não estou conseguindo seguir" },
  { id: "workout", icon: "😓", label: "Dificuldade com treino", description: "Preciso de ajustes" },
  { id: "motivation", icon: "💭", label: "Falta de motivação", description: "Preciso de apoio" },
  { id: "doubt", icon: "❓", label: "Dúvida geral", description: "Tenho uma pergunta" },
  { id: "pain", icon: "🤕", label: "Dor ou desconforto", description: "Sinto algo diferente" },
];

export const habitTracking = {
  water: { current: 1.8, target: 2.5, glasses: [true, true, true, true, true, true, false, false, false, false] },
  sleep: { hours: 7, quality: "boa", bedtime: "23:00", wakeup: "06:00" },
  steps: { current: 6420, target: 8000 },
  mood: "bem" as const,
};
