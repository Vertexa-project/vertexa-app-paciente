// Enhanced workout data for guided execution flow
// GIFs OFICIAIS da cliente (bundle): src/assets/exercises/* via import.meta.glob (Sessão 3).
// Exercícios sem asset oficial mantêm a URL de terceiros como fallback (pendência pontual).

export interface ExerciseSet {
  reps: number;
  weight: number;
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];
  sets: ExerciseSet[];
  restSeconds: number;
  gifUrl: string;
  notes?: string;
}

export interface Workout {
  id: string;
  letter: string;
  name: string;
  muscleGroup: string;
  dayOfWeek: string;
  dayIndex: number; // 0=Dom, 1=Seg...
  exercises: Exercise[];
  estimatedMinutes: number;
  estimatedCalories: number;
  completed: boolean;
}

// ── GIFs oficiais da cliente (bundle) ──
// Resolvidos por nome de arquivo NORMALIZADO (tolera espaços/acentos/maiúsculas/hífens/trailing
// space). Onde não há asset oficial, o gifUrl mantém a URL de terceiros como fallback.
const OFFICIAL_EXERCISE_GIFS = import.meta.glob("../assets/exercises/*.gif", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const normGifKey = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

const officialGifByKey: Record<string, string> = {};
for (const [path, url] of Object.entries(OFFICIAL_EXERCISE_GIFS)) {
  const base = (path.split("/").pop() ?? "").replace(/\.gif$/i, "");
  officialGifByKey[normGifKey(base)] = url;
}

/** URL do GIF oficial da cliente p/ o nome de arquivo informado; avisa em DEV se faltar. */
function ex(file: string): string {
  const url = officialGifByKey[normGifKey(file)];
  if (!url && import.meta.env.DEV) {
    console.warn(`[VERTEXA workoutData] GIF oficial não encontrado: "${file}"`);
  }
  return url ?? "";
}

export const workoutSchedule: Workout[] = [
  {
    id: "workout-a",
    letter: "A",
    name: "Costas e Bíceps",
    muscleGroup: "Costas",
    dayOfWeek: "Seg",
    dayIndex: 1,
    exercises: [
      {
        id: "ex-1",
        name: "Puxada frontal",
        muscleGroups: ["Dorsais", "Bíceps", "Antebraços"],
        sets: [
          { reps: 12, weight: 40, completed: false },
          { reps: 12, weight: 40, completed: false },
          { reps: 10, weight: 45, completed: false },
          { reps: 10, weight: 45, completed: false },
        ],
        restSeconds: 60,
        gifUrl: ex("PUXADA ALTA - TREINO A"),
        notes: "Manter escápulas retraídas",
      },
      {
        id: "ex-2",
        name: "Remada curvada",
        muscleGroups: ["Dorsais", "Romboides", "Bíceps"],
        sets: [
          { reps: 12, weight: 30, completed: false },
          { reps: 12, weight: 30, completed: false },
          { reps: 10, weight: 35, completed: false },
          { reps: 10, weight: 35, completed: false },
        ],
        restSeconds: 60,
        gifUrl: ex("REMADA CURVADA - TREINO A"),
        notes: "Costas retas, puxar para o abdômen",
      },
      {
        id: "ex-3",
        name: "Remada unilateral",
        muscleGroups: ["Dorsais", "Romboides"],
        sets: [
          { reps: 12, weight: 18, completed: false },
          { reps: 12, weight: 18, completed: false },
          { reps: 12, weight: 18, completed: false },
        ],
        restSeconds: 45,
        gifUrl: ex("REMADA UNILATERAL - TREINO A"),
      },
      {
        id: "ex-4",
        name: "Rosca direta barra",
        muscleGroups: ["Bíceps", "Antebraços"],
        sets: [
          { reps: 12, weight: 16, completed: false },
          { reps: 12, weight: 16, completed: false },
          { reps: 10, weight: 18, completed: false },
        ],
        restSeconds: 45,
        gifUrl: ex("Rosca Direta Barra - TREINO A"),
        notes: "Controlar a descida",
      },
      {
        id: "ex-5",
        name: "Rosca martelo",
        muscleGroups: ["Bíceps", "Braquial"],
        sets: [
          { reps: 12, weight: 10, completed: false },
          { reps: 12, weight: 10, completed: false },
          { reps: 12, weight: 10, completed: false },
        ],
        restSeconds: 45,
        gifUrl: ex("Rosca Martelo - TREINO A"),
      },
    ],
    estimatedMinutes: 50,
    estimatedCalories: 320,
    completed: false,
  },
  {
    id: "workout-b",
    letter: "B",
    name: "Peito e Tríceps",
    muscleGroup: "Peito",
    dayOfWeek: "Ter",
    dayIndex: 2,
    exercises: [
      {
        id: "ex-6",
        name: "Supino reto",
        muscleGroups: ["Peitoral", "Tríceps", "Deltóide anterior"],
        sets: [
          { reps: 12, weight: 40, completed: false },
          { reps: 10, weight: 50, completed: false },
          { reps: 10, weight: 50, completed: false },
          { reps: 8, weight: 55, completed: false },
        ],
        restSeconds: 90,
        gifUrl: ex("Supino Reto Barra - treino b"),
        notes: "Descer até o peito, subir explosivo",
      },
      {
        id: "ex-7",
        name: "Supino inclinado halteres",
        muscleGroups: ["Peitoral superior", "Tríceps"],
        sets: [
          { reps: 12, weight: 16, completed: false },
          { reps: 12, weight: 16, completed: false },
          { reps: 10, weight: 18, completed: false },
        ],
        restSeconds: 60,
        gifUrl: ex("Supino Inclinado Halteres"),
      },
      {
        id: "ex-8",
        name: "Crucifixo máquina",
        muscleGroups: ["Peitoral"],
        sets: [
          { reps: 15, weight: 30, completed: false },
          { reps: 15, weight: 30, completed: false },
          { reps: 12, weight: 35, completed: false },
        ],
        restSeconds: 45,
        gifUrl: ex("Crucifixo Polia treino b"),
      },
      {
        id: "ex-9",
        name: "Tríceps corda",
        muscleGroups: ["Tríceps"],
        sets: [
          { reps: 15, weight: 20, completed: false },
          { reps: 15, weight: 20, completed: false },
          { reps: 12, weight: 25, completed: false },
        ],
        restSeconds: 45,
        gifUrl: ex("Tríceps Pulley - treino b"),
      },
      {
        id: "ex-10",
        name: "Tríceps testa",
        muscleGroups: ["Tríceps"],
        sets: [
          { reps: 12, weight: 14, completed: false },
          { reps: 12, weight: 14, completed: false },
          { reps: 12, weight: 14, completed: false },
        ],
        restSeconds: 45,
        gifUrl: ex("Tríceps Testa"),
      },
    ],
    estimatedMinutes: 45,
    estimatedCalories: 290,
    completed: false,
  },
  {
    id: "workout-c",
    letter: "C",
    name: "Ombros e Trapézio",
    muscleGroup: "Ombros",
    dayOfWeek: "Qua",
    dayIndex: 3,
    exercises: [
      {
        id: "ex-11",
        name: "Desenvolvimento militar",
        muscleGroups: ["Deltóide", "Tríceps"],
        sets: [
          { reps: 12, weight: 20, completed: false },
          { reps: 10, weight: 25, completed: false },
          { reps: 10, weight: 25, completed: false },
          { reps: 8, weight: 30, completed: false },
        ],
        restSeconds: 60,
        gifUrl: ex("desenvolvimento com halter"),
      },
      {
        id: "ex-12",
        name: "Elevação lateral",
        muscleGroups: ["Deltóide lateral"],
        sets: [
          { reps: 15, weight: 8, completed: false },
          { reps: 15, weight: 8, completed: false },
          { reps: 12, weight: 10, completed: false },
          { reps: 12, weight: 10, completed: false },
        ],
        restSeconds: 45,
        gifUrl: ex("elevação lateral"),
        notes: "Levantar até a linha dos ombros",
      },
      {
        id: "ex-13",
        name: "Elevação frontal",
        muscleGroups: ["Deltóide anterior"],
        sets: [
          { reps: 12, weight: 8, completed: false },
          { reps: 12, weight: 8, completed: false },
          { reps: 12, weight: 8, completed: false },
        ],
        restSeconds: 45,
        gifUrl: ex("ELEVAÇÃO FRONTAL"),
      },
      {
        id: "ex-14",
        name: "Encolhimento barra",
        muscleGroups: ["Trapézio"],
        sets: [
          { reps: 15, weight: 40, completed: false },
          { reps: 15, weight: 40, completed: false },
          { reps: 12, weight: 50, completed: false },
        ],
        restSeconds: 45,
        gifUrl: ex("Encolhimento Barra"),
      },
      {
        id: "ex-15",
        name: "Face pull",
        muscleGroups: ["Deltóide posterior", "Trapézio"],
        sets: [
          { reps: 15, weight: 15, completed: false },
          { reps: 15, weight: 15, completed: false },
          { reps: 15, weight: 15, completed: false },
        ],
        restSeconds: 45,
        gifUrl: ex("Face Pull Polia"),
        notes: "Puxar até o nível do rosto",
      },
    ],
    estimatedMinutes: 40,
    estimatedCalories: 224,
    completed: false,
  },
  {
    id: "workout-d",
    letter: "D",
    name: "Pernas — Quadríceps",
    muscleGroup: "Pernas",
    dayOfWeek: "Qui",
    dayIndex: 4,
    exercises: [
      {
        id: "ex-16",
        name: "Agachamento livre",
        muscleGroups: ["Quadríceps", "Glúteos", "Core"],
        sets: [
          { reps: 12, weight: 40, completed: false },
          { reps: 10, weight: 50, completed: false },
          { reps: 10, weight: 50, completed: false },
          { reps: 8, weight: 60, completed: false },
        ],
        restSeconds: 90,
        gifUrl: ex("agachamento livre"),
        notes: "Descer até 90° ou mais",
      },
      {
        id: "ex-17",
        name: "Leg press 45°",
        muscleGroups: ["Quadríceps", "Glúteos"],
        sets: [
          { reps: 15, weight: 100, completed: false },
          { reps: 12, weight: 120, completed: false },
          { reps: 12, weight: 120, completed: false },
          { reps: 10, weight: 140, completed: false },
        ],
        restSeconds: 90,
        gifUrl: ex("LEG PRESS 45"),
      },
      {
        id: "ex-18",
        name: "Cadeira extensora",
        muscleGroups: ["Quadríceps"],
        sets: [
          { reps: 15, weight: 30, completed: false },
          { reps: 15, weight: 30, completed: false },
          { reps: 12, weight: 35, completed: false },
        ],
        restSeconds: 45,
        gifUrl: ex("EXTENSORA"),
      },
      {
        id: "ex-19",
        name: "Avanço com halteres",
        muscleGroups: ["Quadríceps", "Glúteos"],
        sets: [
          { reps: 12, weight: 12, completed: false },
          { reps: 12, weight: 12, completed: false },
          { reps: 12, weight: 12, completed: false },
        ],
        restSeconds: 60,
        gifUrl: ex("Avanço Halteres"),
      },
      {
        id: "ex-20",
        name: "Panturrilha em pé",
        muscleGroups: ["Panturrilha"],
        sets: [
          { reps: 20, weight: 40, completed: false },
          { reps: 20, weight: 40, completed: false },
          { reps: 20, weight: 40, completed: false },
          { reps: 20, weight: 40, completed: false },
        ],
        restSeconds: 30,
        gifUrl: ex("Panturrilha em Pé"),
      },
    ],
    estimatedMinutes: 55,
    estimatedCalories: 380,
    completed: false,
  },
  {
    id: "workout-e",
    letter: "E",
    name: "Pernas — Posterior",
    muscleGroup: "Posterior",
    dayOfWeek: "Sex",
    dayIndex: 5,
    exercises: [
      {
        id: "ex-21",
        name: "Stiff",
        muscleGroups: ["Posterior de coxa", "Glúteos", "Lombar"],
        sets: [
          { reps: 12, weight: 30, completed: false },
          { reps: 10, weight: 35, completed: false },
          { reps: 10, weight: 35, completed: false },
          { reps: 10, weight: 35, completed: false },
        ],
        restSeconds: 60,
        gifUrl: ex("Stiff Barra"),
        notes: "Manter joelhos levemente flexionados",
      },
      {
        id: "ex-22",
        name: "Mesa flexora",
        muscleGroups: ["Posterior de coxa"],
        sets: [
          { reps: 15, weight: 25, completed: false },
          { reps: 12, weight: 30, completed: false },
          { reps: 12, weight: 30, completed: false },
        ],
        restSeconds: 45,
        gifUrl: ex("Cadeira Flexora"),
      },
      {
        id: "ex-23",
        name: "Elevação pélvica",
        muscleGroups: ["Glúteos", "Posterior de coxa"],
        sets: [
          { reps: 15, weight: 40, completed: false },
          { reps: 15, weight: 40, completed: false },
          { reps: 12, weight: 50, completed: false },
        ],
        restSeconds: 60,
        gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Hip-Thrust.gif",
      },
      {
        id: "ex-24",
        name: "Cadeira adutora",
        muscleGroups: ["Adutores"],
        sets: [
          { reps: 15, weight: 30, completed: false },
          { reps: 15, weight: 30, completed: false },
          { reps: 15, weight: 30, completed: false },
        ],
        restSeconds: 45,
        gifUrl: ex("Cadeira adutora"),
      },
      {
        id: "ex-25",
        name: "Panturrilha sentado",
        muscleGroups: ["Sóleo", "Panturrilha"],
        sets: [
          { reps: 20, weight: 20, completed: false },
          { reps: 20, weight: 20, completed: false },
          { reps: 20, weight: 20, completed: false },
        ],
        restSeconds: 30,
        gifUrl: ex("panturrilha sentado"),
      },
    ],
    estimatedMinutes: 50,
    estimatedCalories: 298,
    completed: false,
  },
  {
    id: "workout-f",
    letter: "F",
    name: "Peito e Ombros",
    muscleGroup: "Peito/Ombros",
    dayOfWeek: "Sáb",
    dayIndex: 6,
    exercises: [
      {
        id: "ex-26",
        name: "Supino inclinado barra",
        muscleGroups: ["Peitoral superior", "Tríceps"],
        sets: [
          { reps: 12, weight: 30, completed: false },
          { reps: 10, weight: 35, completed: false },
          { reps: 10, weight: 35, completed: false },
          { reps: 8, weight: 40, completed: false },
        ],
        restSeconds: 90,
        gifUrl: ex("Supino Inclinado Barra"),
      },
      {
        id: "ex-27",
        name: "Cross over",
        muscleGroups: ["Peitoral"],
        sets: [
          { reps: 15, weight: 15, completed: false },
          { reps: 15, weight: 15, completed: false },
          { reps: 12, weight: 20, completed: false },
        ],
        restSeconds: 45,
        gifUrl: ex("Crossover Polia"),
      },
      {
        id: "ex-28",
        name: "Desenvolvimento Arnold",
        muscleGroups: ["Deltóide", "Tríceps"],
        sets: [
          { reps: 12, weight: 12, completed: false },
          { reps: 12, weight: 12, completed: false },
          { reps: 10, weight: 14, completed: false },
        ],
        restSeconds: 60,
        gifUrl: ex("DESENVOLVIMENTO ARNOLD"),
      },
      {
        id: "ex-29",
        name: "Elevação lateral inclinado",
        muscleGroups: ["Deltóide posterior"],
        sets: [
          { reps: 15, weight: 6, completed: false },
          { reps: 15, weight: 6, completed: false },
          { reps: 15, weight: 6, completed: false },
        ],
        restSeconds: 45,
        gifUrl: ex("Elevação Lateral Cabo"),
      },
      {
        id: "ex-30",
        name: "Abdominal infra",
        muscleGroups: ["Abdômen inferior"],
        sets: [
          { reps: 20, weight: 0, completed: false },
          { reps: 20, weight: 0, completed: false },
          { reps: 20, weight: 0, completed: false },
        ],
        restSeconds: 30,
        gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Lying-Leg-Raise.gif",
      },
    ],
    estimatedMinutes: 40,
    estimatedCalories: 186,
    completed: false,
  },
];

// ── Warmup / Mobility data ──

export interface WarmupExercise {
  id: string;
  name: string;
  focusArea: string;
  durationSeconds: number;
  reps?: number;
  instruction: string;
  gifUrl: string;
}

// Fluxo de "Preparação" = Treino de membros superiores (Sessão 12).
// Substitui o antigo bloco de mobilidade/ativação, cujos GIFs eram URLs externas
// (fitnessprogramer.com) SEM asset no projeto → cards brancos/quebrados.
// Agora são 5 exercícios com GIF OFICIAL empacotado, resolvido por ex() (import.meta.glob acima).
const preparationExercises: WarmupExercise[] = [
  {
    id: "prep-1",
    name: "Face Pull na Polia",
    focusArea: "Ombros, trapézio e costas",
    durationSeconds: 30,
    reps: 12,
    instruction:
      "Ajuste a corda na altura do rosto. Puxe em direção à face, abrindo os cotovelos e aproximando as escápulas no final do movimento.",
    gifUrl: ex("Face Pull Polia"),
  },
  {
    id: "prep-2",
    name: "Elevação Lateral",
    focusArea: "Ombros",
    durationSeconds: 30,
    reps: 12,
    instruction:
      "Com os halteres ao lado do corpo, eleve os braços lateralmente até a altura dos ombros. Desça de forma controlada.",
    gifUrl: ex("elevação lateral"),
  },
  {
    id: "prep-3",
    name: "Desenvolvimento com Halteres",
    focusArea: "Ombros e tríceps",
    durationSeconds: 35,
    reps: 10,
    instruction:
      "Comece com os halteres na altura dos ombros. Empurre para cima até estender os braços e retorne controlando o movimento.",
    gifUrl: ex("desenvolvimento com halter"),
  },
  {
    id: "prep-4",
    name: "Flexão de Braço",
    focusArea: "Peito, ombros e tríceps",
    durationSeconds: 25,
    reps: 10,
    instruction:
      "Apoie as mãos no chão na linha dos ombros, mantenha o corpo alinhado e desça controlando até aproximar o peito do solo.",
    gifUrl: ex("FLEXÃO"),
  },
  {
    id: "prep-5",
    name: "Encolhimento com Barra",
    focusArea: "Trapézio",
    durationSeconds: 25,
    reps: 12,
    instruction:
      "Segure a barra à frente do corpo e eleve os ombros em direção às orelhas. Pause no topo e desça lentamente.",
    gifUrl: ex("Encolhimento Barra"),
  },
];

// O fluxo de preparação é fixo: Treino de membros superiores (5 exercícios, assets oficiais).
export function getWarmupForWorkout(_workout: Workout): WarmupExercise[] {
  return preparationExercises;
}

export function getWarmupFocusLabel(_workout: Workout): string {
  return "membros superiores";
}

// Helper to get today's workout
export function getTodayWorkout(): Workout | undefined {
  const todayIndex = new Date().getDay(); // 0=Sun, 1=Mon...
  return workoutSchedule.find((w) => w.dayIndex === todayIndex);
}

// Get day label color for badge
export function getDayColor(dayOfWeek: string): string {
  const colors: Record<string, string> = {
    Seg: "bg-amber-500",
    Ter: "bg-rose-500",
    Qua: "bg-emerald-500",
    Qui: "bg-violet-500",
    Sex: "bg-cyan-500",
    Sáb: "bg-amber-700",
  };
  return colors[dayOfWeek] || "bg-muted";
}
