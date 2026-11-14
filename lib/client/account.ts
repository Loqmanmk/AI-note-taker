import { RECORDINGS_BUCKET } from "../recordings";
import { getSupabase } from "./supabase";

/**
 * Deletes the signed-in student's account: their recordings in storage, then the account itself,
 * which also deletes their classes. Throws an Error safe to show.
 */
export async function deleteMyAccount(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Accounts are not set up.");
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Sign in again to delete your account.");

  // Storage files are not removed with the account, so delete them first.
  const files = await supabase.storage.from(RECORDINGS_BUCKET).list(userId);
  if (files.data?.length) {
    await supabase.storage.from(RECORDINGS_BUCKET).remove(files.data.map((file) => `${userId}/${file.name}`));
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw new Error("Could not delete your account. Check your connection and try again.");
  // The account no longer exists, so only the session on this device is cleared.
  await supabase.auth.signOut({ scope: "local" });
}
