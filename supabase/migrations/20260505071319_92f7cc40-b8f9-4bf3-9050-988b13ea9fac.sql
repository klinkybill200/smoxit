
-- POSTS
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('win','struggle','advice','milestone')),
  content text NOT NULL,
  show_stats boolean NOT NULL DEFAULT false,
  reactions integer NOT NULL DEFAULT 0,
  me_too integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts readable by authenticated" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_posts_category ON public.posts(category);

-- COMMENTS
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  reactions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments readable by authenticated" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own comments" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_comments_post ON public.comments(post_id, created_at);

-- POST REACTIONS
CREATE TABLE public.post_reactions (
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like','me_too')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id, type)
);
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions readable by authenticated" ON public.post_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own reactions" ON public.post_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reactions" ON public.post_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger to maintain reaction counters
CREATE OR REPLACE FUNCTION public.update_post_reaction_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.type = 'like' THEN
      UPDATE public.posts SET reactions = reactions + 1 WHERE id = NEW.post_id;
    ELSIF NEW.type = 'me_too' THEN
      UPDATE public.posts SET me_too = me_too + 1 WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.type = 'like' THEN
      UPDATE public.posts SET reactions = GREATEST(reactions - 1, 0) WHERE id = OLD.post_id;
    ELSIF OLD.type = 'me_too' THEN
      UPDATE public.posts SET me_too = GREATEST(me_too - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_post_reactions_count
AFTER INSERT OR DELETE ON public.post_reactions
FOR EACH ROW EXECUTE FUNCTION public.update_post_reaction_count();

-- SQUADS
CREATE TABLE public.squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  is_public boolean NOT NULL DEFAULT true,
  goal text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.squad_members (
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (squad_id, user_id)
);
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check membership without recursion
CREATE OR REPLACE FUNCTION public.is_squad_member(_squad_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.squad_members WHERE squad_id = _squad_id AND user_id = _user_id);
$$;

CREATE POLICY "Squads visible if public or member" ON public.squads FOR SELECT TO authenticated
USING (is_public = true OR public.is_squad_member(id, auth.uid()));
CREATE POLICY "Users create squads" ON public.squads FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator updates squad" ON public.squads FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creator deletes squad" ON public.squads FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Members visible to authenticated" ON public.squad_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users join squads" ON public.squad_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave squads" ON public.squad_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- SQUAD MESSAGES
CREATE TABLE public.squad_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.squad_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Squad members read messages" ON public.squad_messages FOR SELECT TO authenticated
USING (public.is_squad_member(squad_id, auth.uid()));
CREATE POLICY "Squad members post messages" ON public.squad_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_squad_member(squad_id, auth.uid()));
CREATE INDEX idx_squad_messages ON public.squad_messages(squad_id, created_at);

-- CHALLENGES
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  target_participants integer DEFAULT 10000,
  daily_tasks jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Challenges readable by all auth" ON public.challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages challenges" ON public.challenges FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE public.challenge_participants (
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  xp_earned integer NOT NULL DEFAULT 0,
  days_completed integer NOT NULL DEFAULT 0,
  last_completed_date date,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, user_id)
);
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants readable by all auth" ON public.challenge_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users join challenges" ON public.challenge_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.challenge_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users leave challenges" ON public.challenge_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- USER XP aggregate
CREATE TABLE public.user_xp (
  user_id uuid PRIMARY KEY,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User XP readable by all auth" ON public.user_xp FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users upsert own xp" ON public.user_xp FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own xp" ON public.user_xp FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_members;

-- Seed a current week challenge
INSERT INTO public.challenges (title, description, start_date, end_date, target_participants, daily_tasks)
VALUES (
  'NO CRAVING WEEK 🔥',
  'Log a craving and beat it every day this week.',
  CURRENT_DATE - INTERVAL '1 day',
  CURRENT_DATE + INTERVAL '6 days',
  10000,
  '["Log a craving","Beat the craving","Share or comment in feed"]'::jsonb
);
