import { AVATAR_SIGNED_URL_TTL_SECONDS, PROFILE_AVATARS_BUCKET } from "@/lib/avatar/constants";
import { sanitizeAvatarError } from "@/lib/avatar/messages";
import { buildAvatarObjectPath } from "@/lib/avatar/path";
import { removeAvatarWithCleanup, replaceAvatarWithCleanup } from "@/lib/avatar/replaceFlow";
import { supabase } from "@/lib/supabase";

export interface ProfileAvatarFields {
  id: string;
  full_name: string | null;
  avatar_path: string | null;
  avatar_url: string | null;
}

export async function getProfileAvatarFields(profileId: string): Promise<ProfileAvatarFields | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_path, avatar_url")
    .eq("id", profileId)
    .maybeSingle();
  if (error) throw error;
  return (data as ProfileAvatarFields | null) ?? null;
}

export async function getAvatarSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PROFILE_AVATARS_BUCKET)
    .createSignedUrl(path, AVATAR_SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw new Error("sign-failed");
  }
  return data.signedUrl;
}

export async function replaceMyAvatar(input: {
  profileId: string;
  blob: Blob;
  previousPath: string | null;
}): Promise<string> {
  const mime = input.blob.type === "image/jpeg" ? "image/jpeg" : "image/webp";
  const path =
    mime === "image/jpeg"
      ? buildAvatarObjectPath(input.profileId).replace(/\.webp$/, ".jpg")
      : buildAvatarObjectPath(input.profileId);

  try {
    return await replaceAvatarWithCleanup({
      path,
      blob: input.blob,
      previousPath: input.previousPath,
      upload: async (objectPath, blob) => {
        const { error } = await supabase.storage.from(PROFILE_AVATARS_BUCKET).upload(objectPath, blob, {
          contentType: mime,
          upsert: false,
          cacheControl: "31536000",
        });
        if (error) throw new Error(sanitizeAvatarError(error, "upload"));
      },
      setPath: async (objectPath) => {
        const { data, error } = await supabase.rpc("set_my_avatar", { p_path: objectPath });
        if (error) throw new Error(sanitizeAvatarError(error, "save"));
        return (data as string | null) ?? null;
      },
      removeObject: async (objectPath) => {
        const { error } = await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([objectPath]);
        if (error) throw error;
      },
    });
  } catch (err) {
    if (err instanceof Error && /Falha/.test(err.message)) throw err;
    throw new Error(sanitizeAvatarError(err, "save"));
  }
}

export async function removeMyAvatar(): Promise<void> {
  try {
    await removeAvatarWithCleanup({
      clearPath: async () => {
        const { data, error } = await supabase.rpc("remove_my_avatar");
        if (error) throw new Error(sanitizeAvatarError(error, "remove"));
        return (data as string | null) ?? null;
      },
      removeObject: async (objectPath) => {
        const { error } = await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([objectPath]);
        if (error) throw error;
      },
    });
  } catch (err) {
    if (err instanceof Error && /Falha/.test(err.message)) throw err;
    throw new Error(sanitizeAvatarError(err, "remove"));
  }
}
