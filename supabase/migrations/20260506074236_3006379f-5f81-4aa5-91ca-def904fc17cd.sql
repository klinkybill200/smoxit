ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS avatar_emoji text NOT NULL DEFAULT '🔥';
ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS avatar_color text NOT NULL DEFAULT 'hsl(20 80% 55%)';

-- Seed some emojis on existing squads for variety
UPDATE public.squads SET avatar_emoji = (ARRAY['🔥','⚡','🚀','💪','🌟','🦁','🐺','🦅','🐉','🌊','🌈','💎','🏆','🎯','🧠'])[1 + (abs(hashtext(id::text)) % 15)]
WHERE avatar_emoji = '🔥';

UPDATE public.squads SET avatar_color = (ARRAY['hsl(20 80% 55%)','hsl(280 60% 55%)','hsl(180 60% 45%)','hsl(140 50% 45%)','hsl(340 70% 55%)','hsl(40 90% 55%)','hsl(220 70% 55%)'])[1 + (abs(hashtext(id::text || 'c')) % 7)]
WHERE avatar_color = 'hsl(20 80% 55%)';
