"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedRecipePhotoPath } from "@/lib/recipe-photo";
import { warnIfStorageCleanupUnconfirmed } from "@/lib/storage-cleanup";

export type DeleteMemoryState = { formError?: string };

export async function deleteRecipeMemory(
  id: string,
  _previousState: DeleteMemoryState,
  _formData: FormData,
): Promise<DeleteMemoryState> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { formError: "This memory could not be deleted." };

  const { data: memory, error: fetchError } = await supabase
    .from("recipe_memories")
    .select("id,user_id,photo_url")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !memory || memory.user_id !== user.id) {
    return { formError: "This memory could not be deleted." };
  }

  const { data: assets } = await supabase
    .from("recipe_assets")
    .select("storage_bucket,storage_path")
    .eq("recipe_memory_id", id);
  const cleanupReferences = new Map<string, string>();
  for (const asset of assets ?? []) {
    if (asset.storage_bucket && asset.storage_path) cleanupReferences.set(`${asset.storage_bucket}:${asset.storage_path}`, asset.storage_bucket);
  }
  const legacyPath = getOwnedRecipePhotoPath(memory.photo_url, user.id);
  if (legacyPath) cleanupReferences.set(`recipe-photos:${legacyPath}`, "recipe-photos");

  const { data: deleted, error: deleteError } = await supabase
    .from("recipe_memories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (deleteError || !deleted) return { formError: "We could not delete this memory. Please try again." };

  revalidatePath(`/memory/${id}`);
  revalidatePath("/");

  for (const [reference, bucket] of cleanupReferences) {
    const path = reference.slice(bucket.length + 1);
    const cleanupResult = await supabase.storage.from(bucket).remove([path]);
    warnIfStorageCleanupUnconfirmed(id, "post_delete_photo_cleanup", cleanupResult);
  }

  redirect("/");
}
