CREATE SCHEMA IF NOT EXISTS auth;

-- Dummy auth.uid() function because Supabase schema uses it for RLS
-- When running locally with Docker, the app connects as the 'postgres' superuser
-- which automatically bypasses RLS, so this function just needs to exist to prevent errors during schema creation.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
BEGIN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
