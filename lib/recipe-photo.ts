export const recipePhotoExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export const maxRecipePhotoBytes = 6 * 1024 * 1024;

export type RecipeImageMimeType = keyof typeof recipePhotoExtensions;

export function createRecipeImageIdentity(ownerId: string, recipeMemoryId: string, mimeType: string) {
  const extension = recipePhotoExtensions[mimeType as RecipeImageMimeType];
  if (!extension) return { assetId: undefined, extension: undefined, path: undefined, error: "Use a JPEG, PNG, or WebP image." };
  const assetId = crypto.randomUUID();
  return {
    assetId,
    extension,
    path: `${ownerId}/${recipeMemoryId}/${assetId}.${extension}`,
    error: undefined,
  };
}

export function validateRecipePhoto(file: File | null) {
  if (!file) return { extension: undefined, error: undefined };
  const extension = recipePhotoExtensions[file.type as keyof typeof recipePhotoExtensions];
  if (!extension) return { extension: undefined, error: "Use a JPEG, PNG, or WebP image." };
  if (file.size > maxRecipePhotoBytes) return { extension: undefined, error: "Use an image smaller than 6 MB." };
  return { extension, error: undefined };
}

export function getOwnedRecipePhotoPath(photoUrl: string | null, userId: string) {
  if (!photoUrl) return null;
  try {
    const url = new URL(photoUrl);
    const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!configured || new URL(configured).host !== url.host) return null;
    const prefix = "/storage/v1/object/public/recipe-photos/";
    if (!url.pathname.startsWith(prefix)) return null;
    const segments = url.pathname.slice(prefix.length).split("/").map(decodeURIComponent);
    if (segments[0] !== userId || !segments[1]) return null;
    if (segments.length === 3 && segments[1] && segments[2]) return `${segments[0]}/${segments[1]}/${segments[2]}`;
    if (segments.length === 2) return `${segments[0]}/${segments[1]}`;
    return null;
  } catch {
    return null;
  }
}
