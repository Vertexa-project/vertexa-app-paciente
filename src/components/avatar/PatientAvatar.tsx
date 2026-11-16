import { ProfilePhoto } from "@/components/avatar/ProfilePhoto";
import { resolveAvatarView } from "@/lib/avatar/avatarPick";
import { cn } from "@/lib/utils";

/** Rosto do paciente no app: avatar escolhido (bichinho + cor), foto, ou iniciais — na ordem que o paciente escolheu. */
export function PatientAvatar({
  name,
  size = 40,
  className,
  kind,
  avatarKey,
  bg,
  avatarPath,
  legacyUrl,
}: {
  name: string | null | undefined;
  size?: number;
  className?: string;
  kind?: string | null;
  avatarKey?: string | null;
  bg?: string | null;
  avatarPath?: string | null;
  legacyUrl?: string | null;
}) {
  const view = resolveAvatarView({ kind, key: avatarKey, bg, avatarPath, legacyUrl });
  const box = { width: size, height: size };
  if (view.type === "avatar") {
    return (
      <span
        role="img"
        aria-label={`Avatar: ${view.key}`}
        data-testid="patient-avatar-pick"
        data-avatar-key={view.key}
        className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full leading-none", className)}
        style={{ ...box, backgroundColor: view.bg, fontSize: Math.round(size * 0.58) }}
      >
        <span aria-hidden>{view.emoji}</span>
      </span>
    );
  }
  return (
    <ProfilePhoto
      name={name}
      avatarPath={view.type === "photo" ? avatarPath : null}
      legacyUrl={view.type === "photo" ? legacyUrl : null}
      className={cn("shrink-0", className)}
      alt={name ? `Foto de ${name}` : undefined}
      style={{ ...box, fontSize: Math.round(size * 0.34) }}
    />
  );
}
