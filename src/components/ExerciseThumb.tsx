import { useState } from "react";
import { Dumbbell } from "lucide-react";

/** Animação do exercício; sem animação (ou se não carregar), um ícone neutro no lugar da imagem quebrada. */
export default function ExerciseThumb({ src, alt, lazy = true }: { src: string; alt: string; lazy?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground" role="img" aria-label={alt}>
        <Dumbbell size={22} aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      loading={lazy ? "lazy" : "eager"}
      onError={() => setFailed(true)}
    />
  );
}
