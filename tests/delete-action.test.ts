import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  remove: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
  warning: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from, storage: { from: () => ({ remove: mocks.remove }) } })) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/storage-cleanup", () => ({ warnIfStorageCleanupUnconfirmed: mocks.warning }));

import { deleteRecipeMemory } from "@/app/memory/[id]/delete-action";

const user = { id: "user-a" };
const baseMemory: { id: string; user_id: string; photo_url: string | null } = { id: "memory-1", user_id: "user-a", photo_url: null };

function configureMemory(memory: typeof baseMemory | null, fetchError: unknown = null, deleted = memory, deleteError: unknown = null) {
  const select = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: memory, error: fetchError })) })) }));
  const del = vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: deleted, error: deleteError })) })) })) })) }));
  mocks.from.mockReturnValue({ select, delete: del });
}

describe("deleteRecipeMemory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    mocks.remove.mockResolvedValue({ data: [{ name: "photo.webp" }], error: null });
  });

  it("denies unauthenticated and non-owner deletion", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect(await deleteRecipeMemory("memory-1", {}, new FormData())).toEqual({ formError: "This memory could not be deleted." });

    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: "user-b" } }, error: null });
    configureMemory(baseMemory);
    expect(await deleteRecipeMemory("memory-1", {}, new FormData())).toEqual({ formError: "This memory could not be deleted." });
  });

  it("handles missing or already-deleted recipes without false success", async () => {
    configureMemory(null);
    expect(await deleteRecipeMemory("missing", {}, new FormData())).toEqual({ formError: "This memory could not be deleted." });

    configureMemory(baseMemory, null, null, null);
    expect(await deleteRecipeMemory("memory-1", {}, new FormData())).toEqual({ formError: "We could not delete this memory. Please try again." });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("deletes a photo-backed recipe, revalidates, and redirects", async () => {
    const photoUrl = "http://127.0.0.1:54321/storage/v1/object/public/recipe-photos/user-a/photo.webp";
    configureMemory({ ...baseMemory, photo_url: photoUrl });
    await expect(deleteRecipeMemory("memory-1", {}, new FormData())).rejects.toThrow("REDIRECT:/");
    expect(mocks.remove).toHaveBeenCalledWith(["user-a/photo.webp"]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/memory/memory-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.warning).toHaveBeenCalledWith("memory-1", "post_delete_photo_cleanup", expect.anything());
  });

  it("deletes recipes without photos and does not expose malformed paths", async () => {
    configureMemory({ ...baseMemory, photo_url: "https://example.invalid/not-a-recipe-photo" });
    await expect(deleteRecipeMemory("memory-1", {}, new FormData())).rejects.toThrow("REDIRECT:/");
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.warning).not.toHaveBeenCalled();
  });

  it("keeps deletion authoritative when Storage cleanup is ambiguous", async () => {
    const photoUrl = "http://127.0.0.1:54321/storage/v1/object/public/recipe-photos/user-a/photo.webp";
    configureMemory({ ...baseMemory, photo_url: photoUrl });
    mocks.remove.mockResolvedValue({ data: [], error: null });
    await expect(deleteRecipeMemory("memory-1", {}, new FormData())).rejects.toThrow("REDIRECT:/");
    expect(mocks.warning).toHaveBeenCalled();
  });
});
