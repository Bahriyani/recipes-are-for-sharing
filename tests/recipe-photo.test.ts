import { describe, expect, it } from "vitest";
import { getOwnedRecipePhotoPath, validateRecipePhoto } from "@/lib/recipe-photo";

const userId = "11111111-1111-4111-8111-111111111111";

describe("recipe photo validation and ownership", () => {
  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ])("accepts %s and maps it to .%s", (type, extension) => {
    expect(validateRecipePhoto(new File(["photo"], "dish.txt", { type }))).toEqual({ extension, error: undefined });
  });

  it("rejects unsupported and oversized files", () => {
    expect(validateRecipePhoto(new File(["photo"], "dish.gif", { type: "image/gif" })).error).toContain("JPEG");
    expect(validateRecipePhoto(new File([new Uint8Array(6 * 1024 * 1024 + 1)], "dish.webp", { type: "image/webp" })).error).toContain("6 MB");
  });

  it("only derives a removable path from the configured owner's public URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    expect(getOwnedRecipePhotoPath("http://127.0.0.1:54321/storage/v1/object/public/recipe-photos/" + userId + "/old.webp", userId)).toBe(`${userId}/old.webp`);
    expect(getOwnedRecipePhotoPath("http://127.0.0.1:54321/storage/v1/object/public/recipe-photos/other/old.webp", userId)).toBeNull();
    expect(getOwnedRecipePhotoPath("https://evil.example/storage/v1/object/public/recipe-photos/" + userId + "/old.webp", userId)).toBeNull();
  });
});
