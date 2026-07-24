import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userId: "user-a",
  replace: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  recipeInsert: vi.fn(),
  assetInsert: vi.fn(),
  recipeUpdate: vi.fn(),
  assetDelete: vi.fn(),
  recipeDelete: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/components/auth/anonymous-session-bootstrap", () => ({ useAnonymousSession: () => ({ userId: mocks.userId }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage/${path}` } }) }) },
  from: (table: string) => {
    if (table === "recipe_memories") return { insert: mocks.recipeInsert, update: mocks.recipeUpdate, delete: mocks.recipeDelete };
    return { insert: mocks.assetInsert, delete: mocks.assetDelete };
  },
}) }));
import CreatePage from "@/app/create/page";

function chain(result: unknown) {
  const builder: { eq: ReturnType<typeof vi.fn>; then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown> } = {
    eq: vi.fn(() => builder),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

function fillRequired() {
  screen.getAllByRole("textbox").forEach((input, index) => fireEvent.change(input, { target: { value: `value ${index}` } }));
}

function selectFiles(files: File[]) {
  fireEvent.change(screen.getByLabelText(/Photos/), { target: { files } });
}

function submitForm() {
  fireEvent.submit(screen.getByRole("button", { name: /Generate recipe memory/ }));
}

describe("CreatePage gallery creation", () => {
  beforeEach(() => {
    mocks.userId = "user-a";
    vi.stubGlobal("crypto", { randomUUID: vi.fn().mockReturnValueOnce("recipe-id").mockReturnValue("asset-id") });
    mocks.replace.mockReset(); mocks.upload.mockReset(); mocks.remove.mockReset();
    mocks.recipeInsert.mockReset(); mocks.assetInsert.mockReset(); mocks.recipeUpdate.mockReset();
    mocks.assetDelete.mockReset(); mocks.recipeDelete.mockReset();
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ data: [{ name: "removed" }], error: null });
    mocks.recipeInsert.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: { id: "recipe-id" }, error: null }) }) });
    mocks.assetInsert.mockResolvedValue({ error: null });
    mocks.recipeUpdate.mockReturnValue(chain({ error: null }));
    mocks.assetDelete.mockReturnValue(chain({ error: null }));
    mocks.recipeDelete.mockReturnValue(chain({ error: null }));
  });

  it("creates one image as the cover and mirrors its public URL", async () => {
    render(<CreatePage />); fillRequired();
    const file = new File(["x"], "original-name.png", { type: "image/png" });
    selectFiles([file]);
    submitForm();

    await waitFor(() => expect(mocks.assetInsert).toHaveBeenCalled());
    expect(mocks.upload).toHaveBeenCalledWith("user-a/recipe-id/asset-id.png", file, { contentType: "image/png" });
    expect(mocks.assetInsert).toHaveBeenCalledWith([expect.objectContaining({
      recipe_memory_id: "recipe-id", display_order: 0, is_cover: true, asset_type: "image", processing_status: "ready",
      storage_path: "user-a/recipe-id/asset-id.png",
    })]);
    expect(mocks.recipeInsert).toHaveBeenCalledWith(expect.objectContaining({ id: "recipe-id", photo_url: null }));
    expect(mocks.recipeInsert.mock.calls[0][0]).not.toHaveProperty("user_id");
    expect(mocks.recipeUpdate).toHaveBeenCalledWith({ photo_url: "https://storage/user-a/recipe-id/asset-id.png" });
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/memory/recipe-id"));
  });

  it("creates five images in selection order with exactly one cover", async () => {
    render(<CreatePage />); fillRequired();
    const files = ["jpeg", "png", "webp", "second.png", "third.jpg"].map((name, index) => new File([String(index)], name, { type: index === 0 || index === 4 ? "image/jpeg" : index === 2 ? "image/webp" : "image/png" }));
    selectFiles(files);
    submitForm();
    await waitFor(() => expect(mocks.assetInsert).toHaveBeenCalled());
    const rows = mocks.assetInsert.mock.calls[0][0];
    expect(rows).toHaveLength(5);
    expect(rows.map((row: { display_order: number }) => row.display_order)).toEqual([0, 1, 2, 3, 4]);
    expect(rows.filter((row: { is_cover: boolean }) => row.is_cover)).toHaveLength(1);
    expect(rows[0].is_cover).toBe(true);
    expect(rows.every((row: { storage_path: string }) => row.storage_path.startsWith("user-a/recipe-id/"))).toBe(true);
  });

  it("rejects a sixth image before upload or insert", () => {
    render(<CreatePage />); fillRequired();
    selectFiles(Array.from({ length: 6 }, (_, index) => new File(["x"], `${index}.png`, { type: "image/png" })));
    expect(screen.getByRole("status").textContent).toContain("You tried to add 6 more photos.");
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.recipeInsert).not.toHaveBeenCalled();
  });

  it("rejects unsupported and oversized images", () => {
    render(<CreatePage />); fillRequired();
    selectFiles([new File(["x"], "bad.gif", { type: "image/gif" })]);
    expect(screen.getByText("Use a JPEG, PNG, or WebP image.")).toBeTruthy();
    selectFiles([new File([new Uint8Array(6 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })]);
    expect(screen.getByText("Use an image smaller than 6 MB.")).toBeTruthy();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("cleans the recipe, assets, and uploaded objects after a partial upload failure", async () => {
    mocks.upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: "storage unavailable" } });
    render(<CreatePage />); fillRequired();
    selectFiles([
      new File(["x"], "one.png", { type: "image/png" }),
      new File(["y"], "two.png", { type: "image/png" }),
    ]);
    submitForm();
    await waitFor(() => expect(screen.getByText("We could not upload your photos. Please try again.")).toBeTruthy());
    expect(mocks.remove).toHaveBeenCalledWith(["user-a/recipe-id/asset-id.png"]);
    expect(mocks.assetDelete).toHaveBeenCalled();
    expect(mocks.recipeDelete).toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("cleans uploaded objects and the recipe when asset metadata insertion fails", async () => {
    mocks.assetInsert.mockResolvedValue({ error: { message: "asset insert failed" } });
    render(<CreatePage />); fillRequired();
    selectFiles([new File(["x"], "one.webp", { type: "image/webp" })]);
    submitForm();
    await waitFor(() => expect(screen.getByText("We could not save your recipe memory. Please try again.")).toBeTruthy());
    expect(mocks.remove).toHaveBeenCalledWith(["user-a/recipe-id/asset-id.webp"]);
    expect(mocks.assetDelete).toHaveBeenCalled();
    expect(mocks.recipeDelete).toHaveBeenCalled();
  });

  it("keeps form values after recoverable validation failure", () => {
    render(<CreatePage />); fillRequired();
    const title = screen.getByDisplayValue("value 0") as HTMLInputElement;
    selectFiles([]);
    submitForm();
    expect(title.value).toBe("value 0");
    expect(mocks.recipeInsert).toHaveBeenCalled();
  });

  it("allows a recipe with no photos", async () => {
    render(<CreatePage />); fillRequired();
    submitForm();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/memory/recipe-id"));
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.assetInsert).not.toHaveBeenCalled();
  });

  it("appends valid selections, removes previews, and updates the count", () => {
    render(<CreatePage />); fillRequired();
    const first = [new File(["1"], "one.png", { type: "image/png" }), new File(["2"], "two.png", { type: "image/png" })];
    const second = [new File(["3"], "three.png", { type: "image/png" }), new File(["4"], "four.png", { type: "image/png" })];
    selectFiles(first);
    expect(screen.getByText("2 of 5 photos selected")).toBeTruthy();
    expect(screen.getAllByRole("img")).toHaveLength(2);
    selectFiles(second);
    expect(screen.getByText("4 of 5 photos selected")).toBeTruthy();
    expect(screen.getAllByRole("img")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Remove two.png" }));
    expect(screen.getByText("3 of 5 photos selected")).toBeTruthy();
    expect(screen.queryByAltText("Preview of two.png")).toBeNull();
  });

  it("preserves the last valid selection when an additional round exceeds five", () => {
    render(<CreatePage />); fillRequired();
    selectFiles(Array.from({ length: 4 }, (_, index) => new File([String(index)], `${index}.png`, { type: "image/png" })));
    selectFiles([new File(["4"], "four.png", { type: "image/png" }), new File(["5"], "five.png", { type: "image/png" })]);
    expect(screen.getByRole("status").textContent).toContain("You tried to add 2 more photos.");
    expect(screen.getByText("4 of 5 photos selected")).toBeTruthy();
    expect(screen.getAllByRole("img")).toHaveLength(4);
  });

  it("shows single duplicate feedback and clears it after a valid add", async () => {
    render(<CreatePage />); fillRequired();
    const original = new File(["1"], "same.png", { type: "image/png", lastModified: 1 });
    const duplicate = new File(["1"], "same.png", { type: "image/png", lastModified: 1 });
    selectFiles([original]);
    selectFiles([duplicate]);
    expect(screen.getByRole("status").textContent).toContain("Photo already selected");
    expect(screen.getByRole("status").textContent).toContain("This photo is already in your current selection and was not added again.");
    submitForm();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/memory/recipe-id"));
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    selectFiles([new File(["2"], "new.png", { type: "image/png", lastModified: 2 })]);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("2 of 5 photos selected")).toBeTruthy();
  });

  it("shows multiple duplicate feedback", () => {
    render(<CreatePage />); fillRequired();
    const first = new File(["1"], "one.png", { type: "image/png", lastModified: 1 });
    const second = new File(["2"], "two.png", { type: "image/png", lastModified: 2 });
    selectFiles([first, second]);
    selectFiles([
      new File(["1"], "one.png", { type: "image/png", lastModified: 1 }),
      new File(["2"], "two.png", { type: "image/png", lastModified: 2 }),
    ]);
    expect(screen.getByRole("status").textContent).toContain("Photos already selected");
    expect(screen.getByRole("status").textContent).toContain("2 selected photos were already in your current selection");
  });

  it("shows the maximum banner and preserves the existing selection", async () => {
    render(<CreatePage />); fillRequired();
    selectFiles(Array.from({ length: 4 }, (_, index) => new File([String(index)], `${index}.png`, { type: "image/png", lastModified: index })));
    selectFiles([
      new File(["4"], "four.png", { type: "image/png", lastModified: 4 }),
      new File(["5"], "five.png", { type: "image/png", lastModified: 5 }),
    ]);
    expect(screen.getByRole("status").textContent).toContain("Maximum photos reached");
    expect(screen.getByRole("status").textContent).toContain("You tried to add 2 more photos.");
    expect(screen.getByRole("status").textContent).toContain("Your existing 4 selected photos have been kept.");
    expect(screen.getAllByRole("img")).toHaveLength(4);
    submitForm();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/memory/recipe-id"));
    expect(mocks.upload).toHaveBeenCalledTimes(4);
  });

  it("handles mixed duplicate and valid selections", () => {
    render(<CreatePage />); fillRequired();
    const existing = new File(["1"], "existing.png", { type: "image/png", lastModified: 1 });
    selectFiles([existing]);
    selectFiles([
      new File(["1"], "existing.png", { type: "image/png", lastModified: 1 }),
      new File(["2"], "new.png", { type: "image/png", lastModified: 2 }),
    ]);
    expect(screen.getByRole("status").textContent).toContain("Photo already selected");
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("submits five visible photos after rejecting a two-photo over-limit round", async () => {
    render(<CreatePage />); fillRequired();
    selectFiles(Array.from({ length: 5 }, (_, index) => new File([String(index)], `${index}.png`, { type: "image/png", lastModified: index })));
    selectFiles([
      new File(["5"], "five.png", { type: "image/png", lastModified: 5 }),
      new File(["6"], "six.png", { type: "image/png", lastModified: 6 }),
    ]);
    expect(screen.getByRole("status")).toBeTruthy();
    submitForm();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/memory/recipe-id"));
    expect(mocks.upload).toHaveBeenCalledTimes(5);
    expect(mocks.upload.mock.calls.every(([, file]) => !["five.png", "six.png"].includes(file.name))).toBe(true);
  });

  it("clears duplicate feedback after removing a photo", () => {
    render(<CreatePage />); fillRequired();
    const file = new File(["1"], "remove.png", { type: "image/png", lastModified: 1 });
    selectFiles([file]);
    selectFiles([new File(["1"], "remove.png", { type: "image/png", lastModified: 1 })]);
    expect(screen.getByRole("status")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove remove.png" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });
});
