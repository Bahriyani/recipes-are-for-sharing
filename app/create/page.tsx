"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAnonymousSession } from "@/components/auth/anonymous-session-bootstrap";
import { createClient } from "@/lib/supabase/client";
import { recipeMemoryFields, validateRecipeMemoryText } from "@/lib/recipe-memory-validation";
import { createRecipeImageIdentity, validateRecipePhoto } from "@/lib/recipe-photo";
import { PhotoFeedbackBanner, type PhotoFeedback } from "@/components/recipe/photo-feedback-banner";

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
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoFeedback, setPhotoFeedback] = useState<PhotoFeedback | null>(null);
  const [status, setStatus] = useState("");
  const [createdMemoryId, setCreatedMemoryId] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    const existingKeys = new Set(photos.map((file) => `${file.name}:${file.size}:${file.type}:${file.lastModified}`));
    const newFiles = selected.filter((file) => {
      const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });
    const duplicateCount = selected.length - newFiles.length;
    const totalCount = photos.length + newFiles.length;

    if (totalCount > maxRecipeImages) {
      const newCount = selected.length;
      const existingCount = photos.length;
      setPhotoFeedback({
        tone: "attention",
        heading: "Maximum photos reached",
        body: `You tried to add ${newCount} more ${newCount === 1 ? "photo" : "photos"}. Your existing ${existingCount} ${existingCount === 1 ? "selected photo has" : "selected photos have"} been kept. The newly selected ${newCount === 1 ? "photo was" : "photos were"} not added because the maximum is 5 photos.`,
      });
      return;
    }

    for (const file of newFiles) {
      const validation = validateRecipePhoto(file);
      if (validation.error) {
        setErrors((current) => ({ ...current, photo: validation.error ?? "Invalid image." }));
        return;
      }
    }

    setPhotos([...photos, ...newFiles]);
    setPhotoFeedback(duplicateCount > 0 ? {
      tone: "information",
      heading: duplicateCount === 1 ? "Photo already selected" : "Photos already selected",
      body: duplicateCount === 1
        ? "This photo is already in your current selection and was not added again."
        : `${duplicateCount} selected photos were already in your current selection and were not added again.`,
    } : null);
    setErrors((current) => {
      const next = { ...current };
      delete next.photo;
      return next;
    });
  }

  function removePhoto(index: number) {
    setPhotos((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setPhotoFeedback(null);
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
    if (!photos.length && errors.photo) nextErrors.photo = errors.photo;
    if (photos.length > maxRecipeImages) nextErrors.photo = `You selected ${photos.length} photos. Maximum is 5.`;
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

      const { error: assetsError } = uploadedAssets.length
        ? await supabase.from("recipe_assets").insert(
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
        )
        : { error: null };
      if (assetsError) throw new Error("asset_insert");

      const { error: mirrorError } = uploadedAssets.length
        ? await supabase
          .from("recipe_memories")
          .update({ photo_url: uploadedAssets[0].publicUrl })
          .eq("id", recipeMemoryId)
          .eq("user_id", userId)
        : { error: null };
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
      <label>Photos
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotoSelection} />
        <small>Add up to 5 photos. You can select multiple photos from your device.</small>
        {photos.length > 0 && <>
          <p aria-live="polite">{photos.length} of 5 photos selected</p>
          {photoFeedback && <PhotoFeedbackBanner feedback={photoFeedback} />}
          <div className="photo-preview-grid" aria-label="Selected photos">{photos.map((file, index) => <figure key={`${file.name}-${file.lastModified}`} className="photo-preview">
            <img src={previewUrls[index]} alt={`Preview of ${file.name}`} />
            <figcaption>{file.name}</figcaption>
            <button type="button" className="button secondary" aria-label={`Remove ${file.name}`} onClick={() => removePhoto(index)}>Remove</button>
          </figure>)}</div>
        </>}
        {photoFeedback && photos.length === 0 && <PhotoFeedbackBanner feedback={photoFeedback} />}
        {errors.photo && <span className="field-error">{errors.photo}</span>}
      </label>
      {errors.session && <p className="notice error">{errors.session}</p>}
      {errors.form && <p className="notice error">{errors.form}</p>}
      {createdMemoryId && <p className="notice">Your memory is ready. <a href={`/memory/${createdMemoryId}`}>Open it now</a>.</p>}
      <button className="button" disabled={Boolean(status)}>{status || "Generate recipe memory"}</button>
    </form>
  </main>;
}
