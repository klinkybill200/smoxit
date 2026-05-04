ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_currency text
  CHECK (preferred_currency IN ('eur', 'usd'));

COMMENT ON COLUMN public.profiles.preferred_currency IS 'User-preferred billing & display currency: eur or usd. NULL until detected from locale on first sign-in.';