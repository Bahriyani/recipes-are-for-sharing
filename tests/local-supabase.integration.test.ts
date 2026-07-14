import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createLocalClients,
  createTestUser,
  getLocalSupabaseConfig,
  localConfigForAuth,
  signInTestUser,
} from "./helpers/local-supabase";

describe("local Supabase ownership and storage policies", () => {
  const runId = `rfs-it-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const titlePrefix = `Integration ${runId}`;
  let admin: ReturnType<typeof createLocalClients>["admin"];
  let anon: ReturnType<typeof createLocalClients>["anon"];
  let userA: { id: string; email: string; password: string };
  let userB: { id: string; email: string; password: string };
  let clientA: ReturnType<typeof createLocalClients>["anon"];
  let clientB: ReturnType<typeof createLocalClients>["anon"];
  const objectPaths: string[] = [];
  const rowIds: string[] = [];

  beforeAll(async () => {
    const clients = createLocalClients();
    admin = clients.admin;
    anon = clients.anon;
    userA = await createTestUser(admin, runId, "user-a");
    userB = await createTestUser(admin, runId, "user-b");
    const { url, anonKey } = localConfigForAuth();
    clientA = await signInTestUser(url, anonKey, userA);
    clientB = await signInTestUser(url, anonKey, userB);
  });

  afterAll(async () => {
    for (const path of objectPaths) {
      await admin.storage.from("recipe-photos").remove([path]);
    }
    if (rowIds.length) {
      await admin.from("recipe_memories").delete().in("id", rowIds);
    }
    if (userA?.id) await admin.auth.admin.deleteUser(userA.id);
    if (userB?.id) await admin.auth.admin.deleteUser(userB.id);
  });

  it("verifies database ownership, public reads, and auth-user deletion", async () => {
    const config = getLocalSupabaseConfig();
    expect(config.url).toBe("http://127.0.0.1:54321");

    const { count: migrationCount, error: migrationError } = await anon
      .from("recipe_memories")
      .select("id", { count: "exact", head: true });
    expect(migrationError).toBeNull();
    expect(migrationCount).toBeGreaterThanOrEqual(5);

    const { data: demos, error: demoError } = await anon
      .from("recipe_memories")
      .select("user_id")
      .in("id", [
        "b1b2c3d4-0001-4001-8001-000000000001",
        "b1b2c3d4-0002-4002-8002-000000000002",
        "b1b2c3d4-0003-4003-8003-000000000003",
        "b1b2c3d4-0004-4004-8004-000000000004",
        "b1b2c3d4-0005-4005-8005-000000000005",
      ]);
    expect(demoError).toBeNull();
    expect(demos?.length).toBe(5);
    expect(demos?.every((row) => row.user_id === null)).toBe(true);

    const { data: inserted, error: insertError } = await clientA
      .from("recipe_memories")
      .insert({
        recipe_title: titlePrefix,
        recipe_details: "Integration test ingredients",
        memory_story: "Integration test story",
        author_name: "Integration Runner",
      })
      .select("id,user_id")
      .single();
    expect(insertError).toBeNull();
    expect(inserted?.user_id).toBe(userA.id);
    rowIds.push(inserted!.id);

    const { error: explicitOtherUserError } = await clientA
      .from("recipe_memories")
      .insert({
        recipe_title: `${titlePrefix} explicit owner`,
        recipe_details: "Should fail",
        memory_story: "Should fail",
        author_name: "Integration Runner",
        user_id: userB.id,
      });
    expect(explicitOtherUserError).not.toBeNull();

    const { error: updateError } = await clientA
      .from("recipe_memories")
      .update({ recipe_details: "Updated by owner" })
      .eq("id", inserted!.id);
    expect(updateError).toBeNull();

    const { data: transfer, error: transferError } = await clientA
      .from("recipe_memories")
      .update({ user_id: userB.id })
      .eq("id", inserted!.id)
      .select("id")
      .maybeSingle();
    expect(transfer).toBeNull();
    expect(transferError).not.toBeNull();

    const { data: bUpdate, error: bUpdateError } = await clientB
      .from("recipe_memories")
      .update({ recipe_details: "Should not change" })
      .eq("id", inserted!.id)
      .select("id")
      .maybeSingle();
    expect(bUpdateError).toBeNull();
    expect(bUpdate).toBeNull();

    for (const client of [clientA, clientB]) {
      const { data, error } = await client
        .from("recipe_memories")
        .update({ recipe_details: "Should not change demo" })
        .eq("id", "b1b2c3d4-0001-4001-8001-000000000001")
        .select("id")
        .maybeSingle();
      expect(error).toBeNull();
      expect(data).toBeNull();
    }

    const { data: publicRows, error: publicError } = await anon
      .from("recipe_memories")
      .select("id")
      .eq("id", inserted!.id);
    expect(publicError).toBeNull();
    expect(publicRows).toHaveLength(1);

    const { error: deleteError } = await clientA
      .from("recipe_memories")
      .delete()
      .eq("id", inserted!.id);
    expect(deleteError).toBeNull();
    rowIds.splice(rowIds.indexOf(inserted!.id), 1);

  });

  it("verifies owner-scoped storage and bucket restrictions", async () => {
    const ownerPath = `${userB.id}/${randomUUID()}.webp`;
    const otherPath = `${userA.id}/${randomUUID()}.webp`;
    objectPaths.push(ownerPath, otherPath);
    const payload = Buffer.from("integration-webp-payload");

    const ownerUpload = await clientB.storage
      .from("recipe-photos")
      .upload(ownerPath, payload, { contentType: "image/webp" });
    expect(ownerUpload.error).toBeNull();

    const crossFolderUpload = await clientB.storage
      .from("recipe-photos")
      .upload(otherPath, payload, { contentType: "image/webp" });
    expect(crossFolderUpload.error).not.toBeNull();

    const crossFolderUpdate = await clientA.storage
      .from("recipe-photos")
      .update(ownerPath, payload, { contentType: "image/webp" });
    expect(crossFolderUpdate.error).not.toBeNull();

    const crossFolderDelete = await clientA.storage
      .from("recipe-photos")
      .remove([ownerPath]);
    expect(crossFolderDelete.error).toBeNull();

    const { data: publicUrl } = anon.storage
      .from("recipe-photos")
      .getPublicUrl(ownerPath);
    const publicResponse = await fetch(publicUrl.publicUrl);
    expect(publicResponse.ok).toBe(true);

    const unsupported = await clientB.storage
      .from("recipe-photos")
      .upload(`${userB.id}/${randomUUID()}.txt`, payload, {
        contentType: "text/plain",
      });
    expect(unsupported.error).not.toBeNull();

    const oversized = await clientB.storage
      .from("recipe-photos")
      .upload(`${userB.id}/${randomUUID()}.webp`, Buffer.alloc(6 * 1024 * 1024 + 1), {
        contentType: "image/webp",
      });
    expect(oversized.error).not.toBeNull();
  });

  it("sets ownership to NULL when a disposable Auth user is deleted", async () => {
    const deletionUser = await createTestUser(admin, runId, "deletion-user");
    const { url, anonKey } = localConfigForAuth();
    const deletionClient = await signInTestUser(url, anonKey, deletionUser);
    const { data: memory, error: insertError } = await deletionClient
      .from("recipe_memories")
      .insert({
        recipe_title: `${titlePrefix} deletion`,
        recipe_details: "Auth deletion test",
        memory_story: "Auth deletion test",
        author_name: "Integration Runner",
      })
      .select("id,user_id")
      .single();
    expect(insertError).toBeNull();
    rowIds.push(memory!.id);

    await admin.auth.admin.deleteUser(deletionUser.id);

    const { data: orphaned, error: orphanedError } = await anon
      .from("recipe_memories")
      .select("id,user_id")
      .eq("id", memory!.id)
      .single();
    expect(orphanedError).toBeNull();
    expect(orphaned?.user_id).toBeNull();
  });
});
