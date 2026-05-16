CREATE TABLE public.native_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios','android')),
  token text NOT NULL UNIQUE,
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_native_push_tokens_user ON public.native_push_tokens(user_id);

ALTER TABLE public.native_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own native tokens"
  ON public.native_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own native tokens"
  ON public.native_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own native tokens"
  ON public.native_push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own native tokens"
  ON public.native_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages native tokens"
  ON public.native_push_tokens FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');