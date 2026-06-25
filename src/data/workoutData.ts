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

// Warmup routines mapped by muscle group keyword
const warmupsByFocus: Record<string, WarmupExercise[]> = {
  default: [
    {
      id: "wu-1",
      name: "Círculos de ombro",
      focusArea: "Ombros e mobilidade escapular",
      durationSeconds: 30,
      instruction: "Faça círculos amplos com os braços, alternando sentido a cada 15s.",
      gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2021/06/Arm-Circles.gif",
    },
    {
      id: "wu-2",
      name: "Rotação torácica",
      focusArea: "Coluna torácica",
      durationSeconds: 30,
      reps: 10,
      instruction: "Em quatro apoios, leve o braço aberto para o lado e acompanhe com o olhar.",
      gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2022/02/Thoracic-Rotation.gif",
    },
    {
      id: "wu-3",
      name: "Agachamento profundo",
      focusArea: "Quadril e tornozelos",
      durationSeconds: 30,
      reps: 8,
      instruction: "Desça devagar até o máximo de amplitude, segure 2s embaixo.",
      gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Bodyweight-Squat.gif",
    },
    {
      id: "wu-4",
      name: "Alongamento de quadril (90/90)",
      focusArea: "Quadril e glúteos",
      durationSeconds: 40,
      instruction: "Sente com as pernas em 90° à frente e atrás. Alterne lados.",
      gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2022/02/90-90-Hip-Stretch.gif",
    },
    {
      id: "wu-5",
      name: "Cat-Cow (Gato-Vaca)",
      focusArea: "Coluna e core",
      durationSeconds: 30,
      reps: 10,
      instruction: "Em quatro apoios, alterne entre arredondar e arquear a coluna com controle.",
      gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2022/02/Cat-Cow-Stretch.gif",
    },
  ],
  upper: [
    {
      id: "wu-u1",
      name: "Círculos de ombro",
      focusArea: "Ombros e mobilidade escapular",
      durationSeconds: 30,
      instruction: "Faça círculos amplos com os braços, alternando sentido a cada 15s.",
      gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2021/06/Arm-Circles.gif",
    },
    {
      id: "wu-u2",
      name: "Rotação torácica",
      focusArea: "Coluna torácica e ombros",
      durationSeconds: 30,
      reps: 10,
      instruction: "Em quatro apoios, leve o braço aberto para o lado e acompanhe com o olhar.",
      gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2022/02/Thoracic-Rotation.gif",
    },
    {
      id: "wu-u3",
      name: "Passa e repassa",
      focusArea: "Mobilidade de ombro",
      durationSeconds: 30,
      reps: 10,
      instruction: "Com um bastão ou toalha, passe por cima da cabeça de frente para trás mantendo os braços estendidos.",
      gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2021/06/Arm-Circles.gif",
    },
    {
      id: "wu-u4",
      name: "Extensão torácica",
      focusArea: "Coluna e peitorais",
      durationSeconds: 30,
      instruction: "Apoie as costas sobre um rolo ou banco e estenda os braços para trás, abrindo o peito.",
      gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2022/02/Cat-Cow-Stretch.gif",
    },
    {
      id: "wu-u5",
      name: "Ativação escapular",
      focusArea: "Escápulas e dorsal",
      durationSeconds: 30,
      reps: 12,
      instruction: "Pendure-se na barra e faça retração e protração da escápula sem flexionar os cotovelos.",
      gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2021/06/Arm-Circles.gif",
    },
  ],
  lower: [
    {
      id: "wu-l1",
      name: "Agachamento profundo",
      focusArea: "Quadril e tornozelos",
      durationSeconds: 30,
      reps: 8,
      instruction: "Desça devagar até o máximo de amplitude, segure 2s embaixo.",
      gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Bodyweight-Squat.gif",
    },
    {
      id: "wu-l2",
      name: "Alongamento de quadril (90/90)",
      focusArea: "Quadril e glúteos",
      durationSeconds: 40,
      instruction: "Sente com as pernas em 90° à frente e atrás. Alterne lados.",
      gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2022/02/90-90-Hip-Stretch.gif",
    },
    {
      id: "wu-l3",
      name: "Mobilidade de tornozelo",
      focusArea: "Tornozelos e panturrilha",
      durationSeconds: 30,
      reps: 10,
      instruction: "Com o pé apoiado num degrau, leve o joelho à frente devagar sem tirar o calcanhar.",
      gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Bodyweight-Squat.gif",
    },
    {
      id: "wu-l4",
      name: "Avanço com rotação",
      focusArea: "Quadril e core",
      durationSeconds: 30,
      reps: 8,
      instruction: "Dê um passo largo à frente e gire o tronco para o lado da perna da frente.",
      gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Bodyweight-Squat.gif",
    },
    {
      id: "wu-l5",
      name: "Ponte de glúteos",
      focusArea: "Glúteos e posterior",
      durationSeconds: 30,
      reps: 12,
      instruction: "Deitado, eleve o quadril contraindo os glúteos no topo. Segure 2s.",
      gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Bodyweight-Squat.gif",
    },
  ],
};

export function getWarmupForWorkout(_workout: Workout): WarmupExercise[] {
  const name = _workout.name.toLowerCase();
  const group = _workout.muscleGroup.toLowerCase();
  
  // Match to upper or lower body based on workout content
  const upperKeywords = ["costas", "peito", "ombro", "bíceps", "tríceps", "braço", "push", "pull", "upper"];
  const lowerKeywords = ["perna", "quadríceps", "posterior", "glúteo", "leg", "lower"];
  
  const isUpper = upperKeywords.some(k => name.includes(k) || group.includes(k));
  const isLower = lowerKeywords.some(k => name.includes(k) || group.includes(k));
  
  if (isLower) return warmupsByFocus.lower;
  if (isUpper) return warmupsByFocus.upper;
  return warmupsByFocus.default;
}

export function getWarmupFocusLabel(workout: Workout): string {
  const name = workout.name.toLowerCase();
  const group = workout.muscleGroup.toLowerCase();
  const upperKeywords = ["costas", "peito", "ombro", "bíceps", "tríceps", "braço", "push", "pull", "upper"];
  const lowerKeywords = ["perna", "quadríceps", "posterior", "glúteo", "leg", "lower"];
  
  if (lowerKeywords.some(k => name.includes(k) || group.includes(k))) return "membros inferiores";
  if (upperKeywords.some(k => name.includes(k) || group.includes(k))) return "membros superiores";
  return "corpo inteiro";
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
