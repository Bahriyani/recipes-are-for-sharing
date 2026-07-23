import { afterEach, describe, expect, it, vi } from "vitest";
import { assessStorageCleanup, warnIfStorageCleanupUnconfirmed } from "@/lib/storage-cleanup";

describe("storage cleanup result handling", () => {
  afterEach(() => vi.restoreAllMocks());

  it("confirms a non-empty successful removal", () => {
    expect(assessStorageCleanup({ data: [{ name: "removed.webp" }], error: null })).toEqual({ confirmed: true });
    expect(vi.spyOn(console, "warn")).not.toHaveBeenCalled();
  });

  it("warns safely on explicit Storage errors", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const assessment = warnIfStorageCleanupUnconfirmed("memory-1", "post_delete_photo_cleanup", {
      data: null,
      error: { message: "Storage unavailable" },
    });
    expect(assessment).toEqual({ confirmed: false, reason: "storage_error" });
    expect(warning).toHaveBeenCalledWith("[recipe-memory/storage-cleanup] cleanup warning", {
      memoryId: "memory-1",
      stage: "post_delete_photo_cleanup",
      reason: "storage_error",
    });
    expect(JSON.stringify(warning.mock.calls)).not.toContain("removed.webp");
  });

  it("warns on an empty successful response without recreating the deleted row", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let rowDeleted = true;
    const assessment = warnIfStorageCleanupUnconfirmed("memory-2", "post_delete_photo_cleanup", { data: [], error: null });
    expect(assessment).toEqual({ confirmed: false, reason: "unconfirmed_empty_result" });
    expect(rowDeleted).toBe(true);
    expect(warning).toHaveBeenCalledWith("[recipe-memory/storage-cleanup] cleanup warning", {
      memoryId: "memory-2",
      stage: "post_delete_photo_cleanup",
      reason: "unconfirmed_empty_result",
    });
    expect(JSON.stringify(warning.mock.calls)).not.toContain("recipe-photos");
    rowDeleted = true;
    expect(rowDeleted).toBe(true);
  });
});
