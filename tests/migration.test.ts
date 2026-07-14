import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/0004_anonymous_ownership.sql", "utf8");

describe("anonymous ownership migration (SQL inspection)", () => {
  it("sets database-owned identity and preserves ownership lifecycle", () => {
    expect(sql).toContain("alter column user_id set default auth.uid()");
    expect(sql).toContain("references auth.users(id)");
    expect(sql).toContain("on delete set null");
  });
  it("keeps public reads and restricts memory mutations to owners", () => {
    expect(sql).toContain('for select to public using (true)');
    for (const action of ["insert", "update", "delete"]) {
      expect(sql).toContain(`recipe_memories_owner_${action}`);
      expect(sql).toContain(`for ${action} to authenticated`);
    }
    expect(sql).toContain("user_id = auth.uid()");
  });
  it("enforces a 6 MB public image bucket and owner-scoped mutations", () => {
    expect(sql).toContain("file_size_limit = 6291456");
    for (const mime of ["image/jpeg", "image/png", "image/webp"]) expect(sql).toContain(mime);
    for (const action of ["insert", "update", "delete"]) expect(sql).toContain(`recipe_photos_owner_${action}`);
    expect(sql).toContain("bucket_id = 'recipe-photos'");
    expect(sql).toContain("(storage.foldername(name))[1] = (select auth.uid()::text)");
  });
});
