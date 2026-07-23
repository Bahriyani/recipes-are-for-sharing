import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/0005_recipe_assets.sql", "utf8");

describe("recipe asset migration", () => {
  it("is additive, constrained, and rerun-safe", () => {
    expect(sql).toContain("create table if not exists public.recipe_assets");
    expect(sql).toContain("on conflict (storage_bucket, storage_path) do nothing");
    expect(sql).toContain("create unique index if not exists recipe_assets_one_cover_per_recipe");
    expect(sql).toContain("constraint recipe_assets_asset_type_check check (asset_type = 'image')");
    expect(sql).toContain("constraint recipe_assets_processing_status_check check (processing_status = 'ready')");
    expect(sql).toContain("constraint recipe_assets_cover_type_check check (not is_cover or asset_type = 'image')");
  });

  it("backfills only recognised recipe-photo Storage URL shapes", () => {
    expect(sql).toContain("/storage/v1/object/public/recipe-photos/");
    expect(sql).toContain("~ '^[0-9a-fA-F-]{36}$'");
    expect(sql).toContain("in ('jpg', 'jpeg', 'png', 'webp')");
    expect(sql).toContain("remains available through the legacy photo_url fallback");
  });

  it("provides an owner-authorized atomic cover replacement function", () => {
    expect(sql).toContain("create or replace function public.replace_recipe_memory_cover_asset");
    expect(sql).toContain("update public.recipe_memories");
    expect(sql).toContain("grant execute on function");
  });
});
