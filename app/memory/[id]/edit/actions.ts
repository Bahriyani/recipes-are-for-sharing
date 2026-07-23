"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  recipeMemoryFields,
  type RecipeMemoryTextField,
  type RecipeMemoryTextValues,
  validateRecipeMemoryText,
} from "@/lib/recipe-memory-validation";
import { createRecipeImageIdentity, getOwnedRecipePhotoPath, validateRecipePhoto } from "@/lib/recipe-photo";

export type EditMemoryState = {
  formError?: string;
  fieldErrors?: Partial<Record<RecipeMemoryTextField, string>>;
  photoError?: string;
};

function readTextValues(formData: FormData): RecipeMemoryTextValues {
  return Object.fromEntries(
    recipeMemoryFields.map((field) => [field, String(formData.get(field) ?? "")]),
  ) as RecipeMemoryTextValues;
}

export async function updateRecipeMemory(
  id: string,
  _previousState: EditMemoryState,
  formData: FormData,
): Promise<EditMemoryState> {
  const values = readTextValues(formData);
  const fieldErrors = validateRecipeMemoryText(values);
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { formError: "You must be signed in as the owner to edit this memory." };

  const { data: memory, error: fetchError } = await supabase
    .from("recipe_memories")
    .select("id,user_id,photo_url")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { formError: "We could not verify this memory. Please try again." };
  if (!memory) return { formError: "This memory could not be found." };
  if (memory.user_id !== user.id) return { formError: "You are not allowed to edit this memory." };

  const photoEntry = formData.get("photo");
  const replacement = typeof File !== "undefined" && photoEntry instanceof File && photoEntry.size > 0 ? photoEntry : null;
  const { extension, error: photoError } = validateRecipePhoto(replacement);
  if (photoError) return { photoError };

  let newPath: string | undefined;
  let newPhotoUrl: string | undefined;
  let newAssetId: string | undefined;
  if (replacement && extension) {
    const identity = createRecipeImageIdentity(user.id, id, replacement.type);
    if (!identity.path || !identity.assetId) return { photoError: "Use a JPEG, PNG, or WebP image." };
    newAssetId = identity.assetId;
    newPath = identity.path;
    const { error: uploadError } = await supabase.storage.from("recipe-photos").upload(newPath, replacement, {
      contentType: replacement.type,
    });
    if (uploadError) return { photoError: "We could not upload your replacement photo. Please try again." };
    newPhotoUrl = supabase.storage.from("recipe-photos").getPublicUrl(newPath).data.publicUrl;
  }

  let updated: { id: string } | null = null;
  let updateError: { message?: string } | null = null;
  if (newPhotoUrl && newPath && newAssetId && replacement) {
    const replacementResult = await supabase.rpc("replace_recipe_memory_cover_asset", {
      p_recipe_memory_id: id,
      p_asset_id: newAssetId,
      p_storage_bucket: "recipe-photos",
      p_storage_path: newPath,
      p_public_url: newPhotoUrl,
      p_mime_type: replacement.type,
      p_byte_size: replacement.size,
      p_recipe_title: values.recipe_title,
      p_recipe_details: values.recipe_details,
      p_memory_story: values.memory_story,
      p_author_name: values.author_name,
    });
    updateError = replacementResult.error;
    if (!updateError && replacementResult.data) updated = { id };
  } else {
    const result = await supabase
      .from("recipe_memories")
      .update(values)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    updated = result.data;
    updateError = result.error;
  }
  if (updateError || !updated) {
    if (newPath) {
      const { error: cleanupError } = await supabase.storage.from("recipe-photos").remove([newPath]);
      if (cleanupError) console.error("[recipe-memory/edit] replacement cleanup failed", { message: cleanupError.message });
    }
    return { formError: "We could not save your changes. Please try again." };
  }

  if (newPhotoUrl) {
    const oldPath = getOwnedRecipePhotoPath(memory.photo_url, user.id);
    if (oldPath) {
      const { error: cleanupError } = await supabase.storage.from("recipe-photos").remove([oldPath]);
      if (cleanupError) console.error("[recipe-memory/edit] old photo cleanup failed", { message: cleanupError.message });
    }
  }

  revalidatePath(`/memory/${id}`);
  redirect(`/memory/${id}`);
}
