-- The image pipeline now uploads WebP (resized + re-encoded for ~10-25KB files,
-- down from ~90KB JPGs). The `images` bucket previously whitelisted only
-- JPEG/PNG, so WebP uploads failed with "mime type image/webp is not supported".
-- Allow WebP alongside the existing types.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png']
WHERE id = 'images';
