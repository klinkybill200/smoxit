ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS max_members integer NOT NULL DEFAULT 20;
ALTER TABLE public.squads ADD CONSTRAINT squads_max_members_range CHECK (max_members BETWEEN 2 AND 100);