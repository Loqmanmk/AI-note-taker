-- Lets a signed-in student delete their own account, as Google Play and the App Store require.
-- Their classes go with it (classes.user_id is "on delete cascade"). The app deletes the student's
-- recordings from storage first; recordings are also deleted after each use.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  -- Only ever the caller's own account.
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
