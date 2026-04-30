-- Profiles table tracks onboarding state per user
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User data: full SMOXIT state synced to cloud (single row per user, JSON blob)
CREATE TABLE public.user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own data" ON public.user_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own data" ON public.user_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own data" ON public.user_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own data" ON public.user_data FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER user_data_updated_at BEFORE UPDATE ON public.user_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();