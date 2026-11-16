import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PatientAvatar } from "@/components/avatar/PatientAvatar";
import { Button } from "@/components/ui/button";
import { saveAvatarPick } from "@/lib/api/avatarPick";
import { AVATAR_ANIMALS, AVATAR_BGS, normalizeAvatarPick } from "@/lib/avatar/avatarPick";
import { cn } from "@/lib/utils";

/** Aba "Avatar": 8 bichinhos + 5 cores de fundo + "Salvar avatar" (grava no banco; aparece no Início e no Perfil). */
export function AvatarPicker({
  name,
  savedKey,
  savedBg,
}: {
  name: string;
  savedKey: string | null | undefined;
  savedBg: string | null | undefined;
}) {
  const queryClient = useQueryClient();
  const saved = normalizeAvatarPick(savedKey, savedBg);
  const [key, setKey] = useState<string | null>(saved?.key ?? null);
  const [bg, setBg] = useState<string>(saved?.bg ?? AVATAR_BGS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const pick = normalizeAvatarPick(key, bg);
  const unchanged = Boolean(pick && saved && pick.key === saved.key && pick.bg === saved.bg);

  async function save() {
    if (!pick || busy) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await saveAvatarPick(pick.key, pick.bg);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      setStatus("Avatar salvo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o avatar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center" data-testid="avatar-picker">
      <div className="mb-4">
        <PatientAvatar name={name} size={96} kind="avatar" avatarKey={key} bg={bg} className="border-2 border-primary" />
      </div>

      <p className="mb-2 self-start text-xs font-semibold text-foreground" id="avatar-animals-label">Escolha um avatar</p>
      <div role="group" aria-labelledby="avatar-animals-label" className="mb-4 grid w-full grid-cols-4 gap-2">
        {AVATAR_ANIMALS.map((a) => (
          <button
            key={a.key}
            type="button"
            aria-label={a.label}
            aria-pressed={key === a.key}
            onClick={() => { setKey(a.key); setStatus(null); }}
            className={cn(
              "grid h-14 place-items-center rounded-xl border bg-muted text-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              key === a.key ? "border-primary ring-2 ring-primary" : "border-border",
            )}
          >
            <span aria-hidden>{a.emoji}</span>
          </button>
        ))}
      </div>

      <p className="mb-2 self-start text-xs font-semibold text-foreground" id="avatar-bg-label">Cor de fundo</p>
      <div role="group" aria-labelledby="avatar-bg-label" className="mb-4 flex w-full items-center gap-3">
        {AVATAR_BGS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Cor de fundo ${c}`}
            aria-pressed={bg === c}
            onClick={() => { setBg(c); setStatus(null); }}
            className={cn(
              "h-10 w-10 rounded-full border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              bg === c ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-card" : "border-border",
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <Button type="button" className="w-full" onClick={() => void save()} disabled={!pick || busy || unchanged}>
        {busy ? "Salvando…" : "Salvar avatar"}
      </Button>
      {(status || error) && (
        <p role="status" className={cn("mt-2 text-center text-xs", error ? "text-destructive" : "text-muted-foreground")}>
          {error ?? status}
        </p>
      )}
    </div>
  );
}
