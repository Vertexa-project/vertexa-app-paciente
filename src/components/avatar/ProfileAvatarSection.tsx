import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AvatarPicker } from "@/components/avatar/AvatarPicker";
import { OwnAvatarControl } from "@/components/avatar/OwnAvatarControl";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveAvatarKind } from "@/lib/api/avatarPick";
import { normalizeAvatarPick } from "@/lib/avatar/avatarPick";

interface Props {
  profileId: string;
  name: string;
  avatarPath: string | null;
  legacyUrl: string | null;
  kind: string | null;
  avatarKey: string | null;
  bg: string | null;
}

/** Perfil: o paciente escolhe entre subir a foto ou montar um avatar. A escolha vale no Início e no Perfil. */
export function ProfileAvatarSection({ profileId, name, avatarPath, legacyUrl, kind, avatarKey, bg }: Props) {
  const queryClient = useQueryClient();
  const hasPhoto = Boolean(avatarPath || legacyUrl);
  const [tab, setTab] = useState<"photo" | "avatar">(kind === "avatar" ? "avatar" : "photo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAvatar = Boolean(normalizeAvatarPick(avatarKey, bg));

  async function switchTo(next: "photo" | "avatar") {
    setBusy(true);
    setError(null);
    try {
      await saveAvatarKind(next);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível trocar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as "photo" | "avatar")} className="mb-4 w-full">
      <TabsList className="mb-4 grid w-full grid-cols-2">
        <TabsTrigger value="photo">Minha foto</TabsTrigger>
        <TabsTrigger value="avatar">Avatar</TabsTrigger>
      </TabsList>
      <TabsContent value="photo" className="mt-0">
        <OwnAvatarControl profileId={profileId} name={name} avatarPath={avatarPath} legacyUrl={legacyUrl} />
        {kind === "avatar" && hasPhoto && (
          <Button type="button" variant="outline" size="sm" className="mx-auto mt-1 flex" disabled={busy} onClick={() => void switchTo("photo")}>
            Usar minha foto no app
          </Button>
        )}
      </TabsContent>
      <TabsContent value="avatar" className="mt-0">
        <AvatarPicker name={name} savedKey={avatarKey} savedBg={bg} />
        {kind === "photo" && hasAvatar && (
          <Button type="button" variant="outline" size="sm" className="mx-auto mt-2 flex" disabled={busy} onClick={() => void switchTo("avatar")}>
            Usar meu avatar salvo
          </Button>
        )}
      </TabsContent>
      {error && <p role="status" className="mt-2 text-center text-xs text-destructive">{error}</p>}
    </Tabs>
  );
}
