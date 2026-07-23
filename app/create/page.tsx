"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAnonymousSession } from "@/components/auth/anonymous-session-bootstrap";
import { createClient } from "@/lib/supabase/client";
import { recipeMemoryFields, validateRecipeMemoryText } from "@/lib/recipe-memory-validation";
import { createRecipeImageIdentity, validateRecipePhoto } from "@/lib/recipe-photo";

const maxRecipeImages = 5;

type FormValues = Record<(typeof recipeMemoryFields)[number], string>;
type UploadedAsset = { id: string; path: string; publicUrl: string };

export default function CreatePage() {
  const router = useRouter();
  const { userId } = useAnonymousSession();
  const [values, setValues] = useState<FormValues>({
    recipe_title: "",
    recipe_details: "",
    memory_story: "",
    author_name: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [createdMemoryId, setCreatedMemoryId] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);

    if (selected.length > maxRecipeImages) {
      setErrors((current) => ({ ...current, photo: "Choose no more than 5 images." }));
      return;
    }

    for (const file of selected) {
      const validation = validateRecipePhoto(file);
      if (validation.error) {
        setErrors((current) => ({ ...current, photo: validation.error ?? "Invalid image." }));
        return;
      }
    }

    setPhotos(selected);
    setErrors((current) => {
      const next = { ...current };
      delete next.photo;
      return next;
    });
  }

  async function cleanUpFailedCreate(
    supabase: ReturnType<typeof createClient>,
    recipeMemoryId: string,
    ownerId: string,
    uploadedAssets: UploadedAsset[],
  ) {
    if (uploadedAssets.length) {
      const { error } = await supabase.storage.from("recipe-photos").remove(uploadedAssets.map((asset) => asset.path));
      if (error) console.warn("[recipe-memory/create] storage cleanup failed", { memoryId: recipeMemoryId, stage: "storage", reason: "storage_error" });
    }

    const { error: assetCleanupError } = await supabase
      .from("recipe_assets")
      .delete()
      .eq("recipe_memory_id", recipeMemoryId);
    if (assetCleanupError) console.warn("[recipe-memory/create] asset cleanup failed", { memoryId: recipeMemoryId, stage: "assets", reason: "database_error" });

    const { error: recipeCleanupError } = await supabase
      .from("recipe_memories")
      .delete()
      .eq("id", recipeMemoryId)
      .eq("user_id", ownerId);
    if (recipeCleanupError) console.warn("[recipe-memory/create] recipe cleanup failed", { memoryId: recipeMemoryId, stage: "recipe", reason: "database_error" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current) return;

    const nextErrors: Record<string, string> = { ...validateRecipeMemoryText(values) };
    if (!userId) nextErrors.session = "Your private session is unavailable. Please refresh and try again.";
    if (!photos.length) nextErrors.photo = "Select at least one JPEG, PNG, or WebP image.";
    if (photos.length > maxRecipeImages) nextErrors.photo = "Choose no more than 5 images.";
    for (const file of photos) {
      const validation = validateRecipePhoto(file);
      if (validation.error) nextErrors.photo = validation.error;
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    if (!userId) return;

    isSubmittingRef.current = true;
    setErrors({});
    setStatus("Creating your memory…");
    const supabase = createClient();
    const recipeMemoryId = crypto.randomUUID();
    const uploadedAssets: UploadedAsset[] = [];

    try {
      const { data, error: recipeError } = await supabase
        .from("recipe_memories")
        .insert({ id: recipeMemoryId, ...values, photo_url: null })
        .select("id")
        .single();
      if (recipeError || !data) throw new Error("recipe_insert");

      for (const file of photos) {
        const identity = createRecipeImageIdentity(userId, recipeMemoryId, file.type);
        if (!identity.path || !identity.assetId) throw new Error("photo_validation");
        const { error: uploadError } = await supabase.storage
          .from("recipe-photos")
          .upload(identity.path, file, { contentType: file.type });
        if (uploadError) throw new Error("storage_upload");
        const publicUrl = supabase.storage.from("recipe-photos").getPublicUrl(identity.path).data.publicUrl;
        uploadedAssets.push({ id: identity.assetId, path: identity.path, publicUrl });
      }

      const { error: assetsError } = await supabase.from("recipe_assets").insert(
        uploadedAssets.map((asset, index) => ({
          id: asset.id,
          recipe_memory_id: recipeMemoryId,
          asset_type: "image",
          storage_bucket: "recipe-photos",
          storage_path: asset.path,
          mime_type: photos[index].type,
          byte_size: photos[index].size,
          display_order: index,
          is_cover: index === 0,
          processing_status: "ready",
        })),
      );
      if (assetsError) throw new Error("asset_insert");

      const { error: mirrorError } = await supabase
        .from("recipe_memories")
        .update({ photo_url: uploadedAssets[0].publicUrl })
        .eq("id", recipeMemoryId)
        .eq("user_id", userId);
      if (mirrorError) throw new Error("recipe_update");

      setCreatedMemoryId(recipeMemoryId);
      setStatus("Memory created. Opening it…");
      router.replace(`/memory/${recipeMemoryId}`);
    } catch (error) {
      await cleanUpFailedCreate(supabase, recipeMemoryId, userId, uploadedAssets);
      isSubmittingRef.current = false;
      setStatus("");
      const reason = error instanceof Error ? error.message : "unknown";
      setErrors({
        form: reason === "storage_upload"
          ? "We could not upload your photos. Please try again."
          : reason === "photo_validation"
            ? "Use JPEG, PNG, or WebP images."
            : "We could not save your recipe memory. Please try again.",
      });
    }
  }

  return <main className="shell narrow">
    <header><a className="brand" href="/">Recipes Are For Sharing</a></header>
    <h1>Preserve a recipe memory</h1>
    <p className="lede">Everything you need for a shareable family recipe.</p>
    <form onSubmit={submit} noValidate>
      {recipeMemoryFields.map((field) => <label key={field}>
        {field === "recipe_title" ? "Recipe title" : field === "recipe_details" ? "Recipe details (ingredients and method)" : field === "memory_story" ? "The memory behind it" : "Your name"}
        {field === "recipe_details" || field === "memory_story"
          ? <textarea value={values[field]} onChange={(event) => setValues({ ...values, [field]: event.target.value })} />
          : <input value={values[field]} onChange={(event) => setValues({ ...values, [field]: event.target.value })} />}
        {errors[field] && <span className="field-error">{errors[field]}</span>}
        {field === "memory_story" && <small>{values.memory_story.trim() ? values.memory_story.trim().split(/\s+/).length : 0} words · 100+ is a lovely keepsake</small>}
      </label>)}
      <label>Photos (1–5)
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotoSelection} />
        {photos.length > 0 && <ul aria-label="Selected photos">{photos.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>)}</ul>}
        {errors.photo && <span className="field-error">{errors.photo}</span>}
      </label>
      {errors.session && <p className="notice error">{errors.session}</p>}
      {errors.form && <p className="notice error">{errors.form}</p>}
      {createdMemoryId && <p className="notice">Your memory is ready. <a href={`/memory/${createdMemoryId}`}>Open it now</a>.</p>}
      <button className="button" disabled={Boolean(status)}>{status || "Generate recipe memory"}</button>
    </form>
  </main>;
}
