-- Create the private `images` bucket used for recipe / food photos.
-- public = false → clients can only fetch via signed URLs minted by the server.

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
