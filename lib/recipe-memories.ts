import { createClient } from "@/lib/supabase/server";

export type RecipeMemory = {
  id: string;
  user_id: string | null;
  recipe_title: string;
  recipe_details: string;
  memory_story: string;
  author_name: string;
  photo_url: string | null;
  created_at: string;
};

export type RecipeMemoryAsset = {
  id: string;
  recipe_memory_id: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  byte_size: number | null;
  display_order: number;
  is_cover: boolean;
  processing_status: string;
  metadata: Record<string, unknown> | null;
  public_url: string;
};

export async function getRecipeMemory(id: string) {
  const supabase = await createClient();
  const [{ data: memory, error: memoryError }, { data: userData }, { data: assets, error: assetsError }] = await Promise.all([
    supabase.from("recipe_memories").select("id,user_id,recipe_title,recipe_details,memory_story,author_name,photo_url,created_at").eq("id", id).maybeSingle(),
    supabase.auth.getUser(),
    supabase.from("recipe_assets").select("id,recipe_memory_id,asset_type,storage_bucket,storage_path,mime_type,byte_size,display_order,is_cover,processing_status,metadata").eq("recipe_memory_id", id).order("display_order", { ascending: true }),
  ]);
  const user = userData.user;
  const orderedAssets: RecipeMemoryAsset[] = assetsError
    ? []
    : (assets ?? [])
      .filter((asset) => asset.asset_type === "image" && asset.processing_status === "ready")
      .map((asset) => ({
        ...asset,
        public_url: supabase.storage.from(asset.storage_bucket).getPublicUrl(asset.storage_path).data.publicUrl,
      }));
  const cover = orderedAssets.find((asset) => asset.is_cover) ?? orderedAssets[0];
  const compatibleMemory = memory
    ? { ...memory, photo_url: cover
      ? cover.public_url
      : memory.photo_url }
    : null;

  return {
    memory: (compatibleMemory as RecipeMemory | null) ?? null,
    error: memoryError,
    user,
    isOwner: Boolean(memory && user && memory.user_id === user.id),
    assets: orderedAssets,
  };
}
