/**
 * Runs against a real Supabase project, usually the local one from `npx supabase start`.
 * Skipped unless SUPABASE_TEST_URL, SUPABASE_TEST_PUBLISHABLE_KEY and SUPABASE_TEST_SECRET_KEY are set.
 * Never point it at production: it creates and deletes users.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLASSES_TABLE, CLASS_COLUMNS, rowsToPendingClasses, rowsToSavedClasses } from "../../lib/classes";
import { SAMPLE_PACK } from "../../lib/sample";
import { SupabaseAuthVerifier, type AuthUser } from "../../lib/server/auth";
import { SupabaseClassRepository } from "../../lib/server/classRepository";
import { SupabaseRecordingStore } from "../../lib/server/recordingStore";
import { RECORDINGS_BUCKET, recordingPath } from "../../lib/recordings";
import { CLASS_USAGE_TABLE, SUBSCRIPTIONS_TABLE, readPlanStatus } from "../../lib/planStatus";
import { SupabasePlanRepository } from "../../lib/server/planRepository";

const url = process.env.SUPABASE_TEST_URL ?? "";
const publishableKey = process.env.SUPABASE_TEST_PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SUPABASE_TEST_SECRET_KEY ?? "";
const config = { url, publishableKey };
const noSession = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

type Student = { user: AuthUser; client: SupabaseClient };

describe.skipIf(!url || !publishableKey || !secretKey)("Supabase accounts (integration)", () => {
  let admin: SupabaseClient;
  const createdIds: string[] = [];
  let alice: Student;
  let bob: Student;

  async function makeStudent(name: string): Promise<Student> {
    const email = `${name}-${Date.now()}@example.test`;
    const password = `pw-${Math.random().toString(36).slice(2)}-X1!`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw created.error ?? new Error("no user");
    createdIds.push(created.data.user.id);

    const client = createClient(url, publishableKey, { auth: noSession });
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error("no session");
    return { user: { id: created.data.user.id, accessToken: signedIn.data.session.access_token }, client };
  }

  beforeAll(async () => {
    admin = createClient(url, secretKey, { auth: noSession });
    alice = await makeStudent("alice");
    bob = await makeStudent("bob");
  });

  afterAll(async () => {
    for (const id of createdIds) await admin.auth.admin.deleteUser(id);
  });

  it("accepts a real access token and rejects a tampered one", async () => {
    const verifier = new SupabaseAuthVerifier(config);
    expect(await verifier.verify(alice.user.accessToken)).toEqual(alice.user);

    const [header, payload, signature] = alice.user.accessToken.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), sub: bob.user.id }),
    ).toString("base64url");
    expect(await verifier.verify(`${header}.${forgedPayload}.${signature}`)).toBeNull();
    expect(await verifier.verify("not-a-token")).toBeNull();
    expect(await verifier.verify("abc.def.ghi")).toBeNull();
  });

  it("saves a class that only its owner can read and delete", async () => {
    const id = await new SupabaseClassRepository(config).save(alice.user, SAMPLE_PACK);

    const own = await alice.client.from(CLASSES_TABLE).select(CLASS_COLUMNS).setHeader("Authorization", `Bearer ${alice.user.accessToken}`);
    expect(rowsToSavedClasses(own.data).map((c) => c.id)).toContain(id);

    const others = await bob.client.from(CLASSES_TABLE).select(CLASS_COLUMNS).setHeader("Authorization", `Bearer ${bob.user.accessToken}`);
    expect(others.data).toEqual([]);

    const anonymous = await createClient(url, publishableKey, { auth: noSession }).from(CLASSES_TABLE).select("id");
    expect(anonymous.data ?? []).toEqual([]);

    const bobDelete = await bob.client.from(CLASSES_TABLE).delete().eq("id", id).select("id").setHeader("Authorization", `Bearer ${bob.user.accessToken}`);
    expect(bobDelete.data).toEqual([]);

    const aliceDelete = await alice.client.from(CLASSES_TABLE).delete().eq("id", id).select("id").setHeader("Authorization", `Bearer ${alice.user.accessToken}`);
    expect(aliceDelete.data).toEqual([{ id }]);
  });

  it("does not let a student write a class into someone else's account", async () => {
    const result = await alice.client
      .from(CLASSES_TABLE)
      .insert({ user_id: bob.user.id, title: "x", subject: "y", pack: SAMPLE_PACK })
      .setHeader("Authorization", `Bearer ${alice.user.accessToken}`);
    expect(result.error).not.toBeNull();
  });

  it("rejects oversized classes written directly to the table", async () => {
    const huge = { ...SAMPLE_PACK, summary: "x".repeat(600_000) };
    const result = await alice.client
      .from(CLASSES_TABLE)
      .insert({ title: "x", subject: "y", pack: huge })
      .setHeader("Authorization", `Bearer ${alice.user.accessToken}`);
    expect(result.error).not.toBeNull();
  });

  it("keeps each student's recordings private, and lets the server fetch and delete them as the student", async () => {
    const audio = new Uint8Array(4096).fill(7);
    const path = recordingPath(alice.user.id, `rec-${Date.now()}`);
    const asAlice = alice.client.storage.from(RECORDINGS_BUCKET);

    const uploaded = await asAlice.upload(path, audio, { contentType: "audio/mp4" });
    expect(uploaded.error).toBeNull();

    // Bob cannot upload into Alice's folder, nor read her file.
    const intrusion = await bob.client.storage
      .from(RECORDINGS_BUCKET)
      .upload(recordingPath(alice.user.id, "intruder"), audio, { contentType: "audio/mp4" });
    expect(intrusion.error).not.toBeNull();
    const store = new SupabaseRecordingStore(config);
    expect(await store.download(bob.user, path)).toBeNull();

    // A file type that is not audio is refused by the bucket.
    const notAudio = await asAlice.upload(recordingPath(alice.user.id, "notes"), audio, { contentType: "application/pdf" });
    expect(notAudio.error).not.toBeNull();

    // The server, acting as Alice, gets the file back intact, then deletes it.
    const blob = await store.download(alice.user, path);
    expect(blob?.size).toBe(audio.length);
    await store.remove(alice.user, path);
    expect(await store.download(alice.user, path)).toBeNull();
  });

  it("runs a background job: processing, then ready or failed, only by its owner", async () => {
    const repository = new SupabaseClassRepository(config);
    const read = async (student: Student) =>
      (await student.client.from(CLASSES_TABLE).select(CLASS_COLUMNS).setHeader("Authorization", `Bearer ${student.user.accessToken}`)).data;

    const done = await repository.createProcessing(alice.user);
    const broken = await repository.createProcessing(alice.user);
    expect(rowsToPendingClasses(await read(alice)).map((c) => c.id)).toEqual(expect.arrayContaining([done, broken]));

    // Bob cannot finish or fail Alice's classes.
    await expect(repository.complete(bob.user, done, SAMPLE_PACK)).rejects.toThrow();
    await expect(repository.fail(bob.user, broken, "x")).rejects.toThrow();

    await repository.complete(alice.user, done, SAMPLE_PACK);
    await repository.fail(alice.user, broken, "The AI service is busy right now.");
    const rows = await read(alice);
    expect(rowsToSavedClasses(rows).map((c) => c.id)).toContain(done);
    expect(rowsToPendingClasses(rows)).toContainEqual(
      expect.objectContaining({ id: broken, status: "failed", error: "The AI service is busy right now." }),
    );

    // A class cannot be marked ready without notes.
    const empty = await repository.createProcessing(alice.user);
    const invalid = await alice.client
      .from(CLASSES_TABLE)
      .update({ status: "ready" })
      .eq("id", empty)
      .setHeader("Authorization", `Bearer ${alice.user.accessToken}`);
    expect(invalid.error).not.toBeNull();
  });

  it("lets a student delete only their own account, with their classes", async () => {
    const carol = await makeStudent("carol");
    await new SupabaseClassRepository(config).save(carol.user, SAMPLE_PACK);

    // Without signing in, the function cannot be called at all.
    const anonymous = await createClient(url, publishableKey, { auth: noSession }).rpc("delete_my_account");
    expect(anonymous.error).not.toBeNull();

    const deleted = await carol.client.rpc("delete_my_account").setHeader("Authorization", `Bearer ${carol.user.accessToken}`);
    expect(deleted.error).toBeNull();

    const account = await admin.auth.admin.getUserById(carol.user.id);
    expect(account.data.user).toBeNull();
    const classes = await admin.from(CLASSES_TABLE).select("id").eq("user_id", carol.user.id);
    expect(classes.data).toEqual([]);

    // Alice is untouched.
    expect((await admin.auth.admin.getUserById(alice.user.id)).data.user?.id).toBe(alice.user.id);
  });

  it("counts a student's classes against their plan, which only the payment system can change", async () => {
    const dave = await makeStudent("dave");
    const plans = new SupabasePlanRepository(config);
    const aliceBefore = (await plans.status(alice.user)).classesUsed;
    expect(await plans.status(dave.user)).toEqual({ plan: "free", classesUsed: 0, classesPerMonth: 3, maxRecordingMinutes: 30 });

    await plans.recordUsage(dave.user, 600);
    // A class being written counts too, so parallel sends cannot go past the limit.
    await new SupabaseClassRepository(config).createProcessing(dave.user);
    expect((await plans.status(dave.user)).classesUsed).toBe(2);
    // Other students' usage is not counted, nor visible.
    expect((await plans.status(alice.user)).classesUsed).toBe(aliceBefore);

    // A student cannot give themselves a plan, nor erase their usage.
    const grant = await dave.client
      .from(SUBSCRIPTIONS_TABLE)
      .insert({ user_id: dave.user.id, plan: "pro" })
      .setHeader("Authorization", `Bearer ${dave.user.accessToken}`);
    expect(grant.error).not.toBeNull();
    await dave.client.from(CLASS_USAGE_TABLE).delete().eq("user_id", dave.user.id).setHeader("Authorization", `Bearer ${dave.user.accessToken}`);
    expect((await plans.status(dave.user)).classesUsed).toBe(2);
    // Nor record usage for someone else.
    const forged = await dave.client
      .from(CLASS_USAGE_TABLE)
      .insert({ user_id: alice.user.id })
      .setHeader("Authorization", `Bearer ${dave.user.accessToken}`);
    expect(forged.error).not.toBeNull();

    // The payment system (service role) grants Premium; it lapses when it expires.
    await admin.from(SUBSCRIPTIONS_TABLE).upsert({ user_id: dave.user.id, plan: "premium", expires_at: "2999-01-01T00:00:00Z" });
    expect(await plans.status(dave.user)).toMatchObject({ plan: "premium", classesPerMonth: 30, maxRecordingMinutes: 120 });
    await admin.from(SUBSCRIPTIONS_TABLE).update({ expires_at: "2000-01-01T00:00:00Z" }).eq("user_id", dave.user.id);
    expect((await plans.status(dave.user)).plan).toBe("free");

    // The phone reads the same status with its own session.
    const fromPhone = await readPlanStatus(
      createClient(url, publishableKey, { auth: noSession, global: { headers: { Authorization: `Bearer ${dave.user.accessToken}` } } }),
    );
    expect(fromPhone.classesUsed).toBe(2);
  });
});
