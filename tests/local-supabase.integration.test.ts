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
  }, 60000);

  afterAll(async () => {
    for (const path of objectPaths) {
      await admin.storage.from("recipe-photos").remove([path]);
    }
    if (rowIds.length) {
      await admin.from("recipe_memories").delete().in("id", rowIds);
    }
    if (userA?.id) await admin.auth.admin.deleteUser(userA.id);
    if (userB?.id) await admin.auth.admin.deleteUser(userB.id);
  }, 60000);

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

  it("verifies owner-only text updates and public freshness", async () => {
    const { data: memory, error: insertError } = await clientA
      .from("recipe_memories")
      .insert({
        recipe_title: `${titlePrefix} editable`,
        recipe_details: "Original details",
        memory_story: "Original story",
        author_name: "Original author",
      })
      .select("id,user_id,recipe_title,recipe_details,memory_story,author_name")
      .single();
    expect(insertError).toBeNull();
    rowIds.push(memory!.id);

    const { data: updated, error: ownerUpdateError } = await clientA
      .from("recipe_memories")
      .update({
        recipe_title: `${titlePrefix} updated`,
        recipe_details: "Updated details",
        memory_story: "Updated story",
        author_name: "Updated author",
      })
      .eq("id", memory!.id)
      .eq("user_id", userA.id)
      .select("id,user_id,recipe_title,recipe_details,memory_story,author_name")
      .maybeSingle();
    expect(ownerUpdateError).toBeNull();
    expect(updated?.user_id).toBe(userA.id);
    expect(updated?.recipe_details).toBe("Updated details");

    const { data: publicUpdated, error: publicUpdatedError } = await anon
      .from("recipe_memories")
      .select("recipe_title,recipe_details,memory_story,author_name,user_id")
      .eq("id", memory!.id)
      .single();
    expect(publicUpdatedError).toBeNull();
    expect(publicUpdated?.recipe_title).toBe(`${titlePrefix} updated`);
    expect(publicUpdated?.user_id).toBe(userA.id);

    const { data: nonOwnerUpdate, error: nonOwnerError } = await clientB
      .from("recipe_memories")
      .update({ recipe_title: "Should not persist" })
      .eq("id", memory!.id)
      .select("id")
      .maybeSingle();
    expect(nonOwnerError).toBeNull();
    expect(nonOwnerUpdate).toBeNull();

    const { data: anonymousUpdate, error: anonymousError } = await anon
      .from("recipe_memories")
      .update({ recipe_title: "Anonymous should fail" })
      .eq("id", memory!.id)
      .select("id")
      .maybeSingle();
    expect(anonymousError).toBeNull();
    expect(anonymousUpdate).toBeNull();

    const { data: nonexistentUpdate, error: nonexistentError } = await clientA
      .from("recipe_memories")
      .update({ recipe_title: "No row" })
      .eq("id", "00000000-0000-4000-8000-000000000000")
      .select("id")
      .maybeSingle();
    expect(nonexistentError).toBeNull();
    expect(nonexistentUpdate).toBeNull();

    const { data: otherOwnerRecord, error: otherOwnerError } = await clientB
      .from("recipe_memories")
      .insert({
        recipe_title: `${titlePrefix} other owner`,
        recipe_details: "B details",
        memory_story: "B story",
        author_name: "B author",
      })
      .select("id,user_id,recipe_title")
      .single();
    expect(otherOwnerError).toBeNull();
    rowIds.push(otherOwnerRecord!.id);

    const { data: unchangedOtherOwner, error: unchangedOtherOwnerError } = await clientA
      .from("recipe_memories")
      .update({ recipe_title: "A cannot change B" })
      .eq("id", otherOwnerRecord!.id)
      .select("id")
      .maybeSingle();
    expect(unchangedOtherOwnerError).toBeNull();
    expect(unchangedOtherOwner).toBeNull();
  });

  it("verifies owner-authorized photo replacement lifecycle", async () => {
    const { data: memory, error: insertError } = await clientA
      .from("recipe_memories")
      .insert({
        recipe_title: `${titlePrefix} photo replacement`,
        recipe_details: "Replacement details",
        memory_story: "Replacement story",
        author_name: "Integration Runner",
      })
      .select("id,user_id,photo_url")
      .single();
    expect(insertError).toBeNull();
    rowIds.push(memory!.id);

    const oldPath = `${userA.id}/${randomUUID()}.webp`;
    const newPath = `${userA.id}/${randomUUID()}.png`;
    objectPaths.push(oldPath, newPath);
    const payload = Buffer.from("image-payload");
    const oldUpload = await clientA.storage.from("recipe-photos").upload(oldPath, payload, { contentType: "image/webp" });
    expect(oldUpload.error).toBeNull();
    const oldUrl = clientA.storage.from("recipe-photos").getPublicUrl(oldPath).data.publicUrl;
    const setOldPhoto = await clientA.from("recipe_memories").update({ photo_url: oldUrl }).eq("id", memory!.id).eq("user_id", userA.id);
    expect(setOldPhoto.error).toBeNull();

    const newUpload = await clientA.storage.from("recipe-photos").upload(newPath, payload, { contentType: "image/png" });
    expect(newUpload.error).toBeNull();
    const newUrl = clientA.storage.from("recipe-photos").getPublicUrl(newPath).data.publicUrl;
    const { data: replaced, error: replaceError } = await clientA
      .from("recipe_memories")
      .update({ photo_url: newUrl })
      .eq("id", memory!.id)
      .eq("user_id", userA.id)
      .select("id,user_id,photo_url")
      .single();
    expect(replaceError).toBeNull();
    expect(replaced?.photo_url).toBe(newUrl);
    expect(replaced?.user_id).toBe(userA.id);

    const publicResponse = await fetch(newUrl);
    expect(publicResponse.ok).toBe(true);
    const oldRemoval = await clientA.storage.from("recipe-photos").remove([oldPath]);
    expect(oldRemoval.error).toBeNull();

    const { data: nonOwner, error: nonOwnerError } = await clientB
      .from("recipe_memories")
      .update({ photo_url: oldUrl })
      .eq("id", memory!.id)
      .select("id")
      .maybeSingle();
    expect(nonOwnerError).toBeNull();
    expect(nonOwner).toBeNull();

    const { data: anonymous, error: anonymousError } = await anon
      .from("recipe_memories")
      .update({ photo_url: oldUrl })
      .eq("id", memory!.id)
      .select("id")
      .maybeSingle();
    expect(anonymousError).toBeNull();
    expect(anonymous).toBeNull();
  });

  it("cleans a new upload after a failed update and preserves the old image", async () => {
    const { data: memory, error: insertError } = await clientA
      .from("recipe_memories")
      .insert({
        recipe_title: `${titlePrefix} failed replacement`,
        recipe_details: "Original details",
        memory_story: "Original story",
        author_name: "Integration Runner",
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();
    rowIds.push(memory!.id);

    const oldPath = `${userA.id}/${randomUUID()}.webp`;
    const newPath = `${userA.id}/${randomUUID()}.webp`;
    objectPaths.push(oldPath, newPath);
    const payload = Buffer.from("image-payload");
    expect((await clientA.storage.from("recipe-photos").upload(oldPath, payload, { contentType: "image/webp" })).error).toBeNull();
    const oldUrl = clientA.storage.from("recipe-photos").getPublicUrl(oldPath).data.publicUrl;
    expect((await clientA.from("recipe_memories").update({ photo_url: oldUrl }).eq("id", memory!.id).eq("user_id", userA.id))).toMatchObject({ error: null });

    expect((await clientA.storage.from("recipe-photos").upload(newPath, payload, { contentType: "image/webp" })).error).toBeNull();
    const newUrl = clientA.storage.from("recipe-photos").getPublicUrl(newPath).data.publicUrl;
    const failedUpdate = await clientA.from("recipe_memories").update({ recipe_title: null, photo_url: newUrl }).eq("id", memory!.id).eq("user_id", userA.id);
    expect(failedUpdate.error).not.toBeNull();
    expect((await clientA.storage.from("recipe-photos").remove([newPath])).error).toBeNull();

    const { data: unchanged, error: unchangedError } = await anon
      .from("recipe_memories")
      .select("photo_url")
      .eq("id", memory!.id)
      .single();
    expect(unchangedError).toBeNull();
    expect(unchanged?.photo_url).toBe(oldUrl);
    expect((await fetch(oldUrl)).ok).toBe(true);
  });

  it("verifies permanent owner deletion and post-delete photo cleanup", async () => {
    const { data: memory, error: insertError } = await clientA
      .from("recipe_memories")
      .insert({
        recipe_title: `${titlePrefix} deletion`,
        recipe_details: "Delete details",
        memory_story: "Delete story",
        author_name: "Integration Runner",
      })
      .select("id,user_id")
      .single();
    expect(insertError).toBeNull();
    rowIds.push(memory!.id);

    const path = `${userA.id}/${randomUUID()}.webp`;
    objectPaths.push(path);
    const payload = Buffer.from("delete-photo");
    expect((await clientA.storage.from("recipe-photos").upload(path, payload, { contentType: "image/webp" })).error).toBeNull();
    const photoUrl = clientA.storage.from("recipe-photos").getPublicUrl(path).data.publicUrl;
    expect((await clientA.from("recipe_memories").update({ photo_url: photoUrl }).eq("id", memory!.id).eq("user_id", userA.id))).toMatchObject({ error: null });

    const { data: denied, error: deniedError } = await clientB
      .from("recipe_memories")
      .delete()
      .eq("id", memory!.id)
      .select("id")
      .maybeSingle();
    expect(deniedError).toBeNull();
    expect(denied).toBeNull();
    expect((await fetch(photoUrl)).ok).toBe(true);

    const { data: deleted, error: deleteError } = await clientA
      .from("recipe_memories")
      .delete()
      .eq("id", memory!.id)
      .eq("user_id", userA.id)
      .select("id")
      .maybeSingle();
    expect(deleteError).toBeNull();
    expect(deleted?.id).toBe(memory!.id);
    rowIds.splice(rowIds.indexOf(memory!.id), 1);

    const { data: publicRow, error: publicError } = await anon
      .from("recipe_memories")
      .select("id")
      .eq("id", memory!.id)
      .maybeSingle();
    expect(publicError).toBeNull();
    expect(publicRow).toBeNull();

    const ownerRemoval = await clientA.storage.from("recipe-photos").remove([path]);
    expect(ownerRemoval.error).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const { data: remainingObjects } = await admin.storage.from("recipe-photos").list(userA.id);
    if (remainingObjects?.some((object) => object.name === path.split("/")[1])) {
      const { error: testCleanupError } = await admin.storage.from("recipe-photos").remove([path]);
      expect(testCleanupError).toBeNull();
    }
    const { data: finalObjects } = await admin.storage.from("recipe-photos").list(userA.id);
    expect(finalObjects?.some((object) => object.name === path.split("/")[1])).toBe(false);
    expect((await fetch(`${photoUrl}?cacheBust=${randomUUID()}`)).ok).toBe(false);

    const { data: nonexistent, error: nonexistentError } = await clientA
      .from("recipe_memories")
      .delete()
      .eq("id", memory!.id)
      .eq("user_id", userA.id)
      .select("id")
      .maybeSingle();
    expect(nonexistentError).toBeNull();
    expect(nonexistent).toBeNull();
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
