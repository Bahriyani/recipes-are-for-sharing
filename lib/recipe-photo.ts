export const recipePhotoExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export const maxRecipePhotoBytes = 6 * 1024 * 1024;

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
    if (segments.length !== 2 || segments[0] !== userId || !segments[1]) return null;
    return `${segments[0]}/${segments[1]}`;
  } catch {
    return null;
  }
}
