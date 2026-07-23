import { createClient } from "@/lib/supabase/server";

export type RecipeAsset = {
  id: string;
  recipe_memory_id: string;
  asset_type: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  byte_size: number | null;
  display_order: number;
  is_cover: boolean;
  processing_status: string;
  metadata: Record<string, unknown>;
};

export async function getRecipeAssets(recipeMemoryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipe_assets")
    .select("id,recipe_memory_id,asset_type,storage_bucket,storage_path,mime_type,byte_size,display_order,is_cover,processing_status,metadata")
    .eq("recipe_memory_id", recipeMemoryId)
    .order("display_order", { ascending: true });

  return { assets: (data as RecipeAsset[] | null) ?? [], error };
}
