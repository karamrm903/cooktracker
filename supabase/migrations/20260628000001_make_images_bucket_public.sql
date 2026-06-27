-- Make the `images` bucket public so recipe/food photos serve via permanent
-- public CDN URLs instead of short-lived signed URLs. This removes the per-request
-- signing round-trip (the main Explore latency) and lets clients cache images
-- forever. Food photos are non-sensitive, so public read is acceptable.

update storage.buckets set public = true where id = 'images';

-- Allow anonymous read of objects in the images bucket (public buckets serve
-- reads through the public path; this policy makes the intent explicit and works
-- even if the bucket is accessed via the authenticated object endpoint).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Public read images bucket'
  ) then
    create policy "Public read images bucket"
      on storage.objects for select
      to public
      using (bucket_id = 'images');
  end if;
end $$;
