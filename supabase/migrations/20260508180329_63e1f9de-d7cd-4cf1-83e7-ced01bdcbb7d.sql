CREATE TABLE public.squad_mutes (
  user_id uuid NOT NULL,
  squad_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, squad_id)
);
ALTER TABLE public.squad_mutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own mutes" ON public.squad_mutes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mutes" ON public.squad_mutes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own mutes" ON public.squad_mutes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role manages mutes" ON public.squad_mutes FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX squad_mutes_squad_idx ON public.squad_mutes(squad_id);