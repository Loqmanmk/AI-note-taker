-- Class recordings, uploaded by the phone before notes are written, and deleted by the server after.
-- Hosting platforms cap request size (Vercel: 4.5 MB), so recordings do not travel through the server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recordings',
  'recordings',
  false,
  52428800, -- 50 MB, about three hours of class
  array['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg']
)
on conflict (id) do nothing;

-- Each student can only touch files inside a folder named after their own user id.
create policy "Students upload their own recordings"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Students read their own recordings"
  on storage.objects for select to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Students delete their own recordings"
  on storage.objects for delete to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);
