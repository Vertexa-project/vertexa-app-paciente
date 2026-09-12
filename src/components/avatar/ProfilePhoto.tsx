import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSignedAvatarUrl } from "@/hooks/useProfileAvatar";
import { avatarInitials } from "@/lib/domain/avatarInitials";
import { cn } from "@/lib/utils";

export function ProfilePhoto({
  name,
  avatarPath,
  legacyUrl,
  className,
  alt,
}: {
  name: string | null | undefined;
  avatarPath?: string | null;
  legacyUrl?: string | null;
  className?: string;
  alt?: string;
}) {
  const signed = useSignedAvatarUrl(avatarPath ?? null);
  const src = signed.data || (!avatarPath ? legacyUrl || undefined : undefined);
  const label = alt ?? name ?? "Foto de perfil";

  return (
    <Avatar className={cn("bg-muted", className)}>
      {src ? <AvatarImage src={src} alt={label} className="object-cover" /> : null}
      <AvatarFallback aria-hidden className="text-[0.7em] font-semibold tracking-wide">
        {avatarInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
