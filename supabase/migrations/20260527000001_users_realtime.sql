-- ── Realtime for public.users ────────────────────────────────────────────────
-- Stream public.users row changes (subscription_status, expiry, etc.) to the
-- subscribed client so the app reflects RevenueCat webhook updates in real time.
-- RLS (users_self_all: auth.uid() = id) restricts each client to its own row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
END $$;
