import { supabase } from "@/lib/supabase";

/**
 * Biblioteca de exercícios da Vertexa (Oficina #581): catálogo global com a animação de cada
 * exercício no bucket público `exercise-library`. O treino prescrito guarda só o nome; aqui o nome
 * (ou um apelido do catálogo) vira a URL da animação, comparando sem acento, caixa ou espaços extras.
 */
const BUCKET = "exercise-library";

export function normalizeExerciseName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function exerciseMediaUrl(supabaseUrl: string | undefined, path: string): string {
  const base = (supabaseUrl ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

interface LibraryRow {
  name: string;
  aliases: string[] | null;
  media_webp: string;
}

/** Índice nome/apelido normalizado → URL. O nome oficial vence um apelido igual de outro item. */
export function buildLibraryMediaIndex(rows: LibraryRow[], supabaseUrl: string | undefined): Map<string, string> {
  const index = new Map<string, string>();
  for (const r of rows) {
    const url = exerciseMediaUrl(supabaseUrl, r.media_webp);
    for (const a of r.aliases ?? []) {
      const key = normalizeExerciseName(a);
      if (key && !index.has(key)) index.set(key, url);
    }
  }
  for (const r of rows) index.set(normalizeExerciseName(r.name), exerciseMediaUrl(supabaseUrl, r.media_webp));
  return index;
}

/** Catálogo inteiro; falha de leitura não derruba o treino (sem animação, o resto segue). */
export async function getExerciseLibraryMediaIndex(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("exercise_library").select("name, aliases, media_webp");
  if (error) return new Map();
  return buildLibraryMediaIndex((data ?? []) as LibraryRow[], import.meta.env.VITE_SUPABASE_URL as string | undefined);
}
