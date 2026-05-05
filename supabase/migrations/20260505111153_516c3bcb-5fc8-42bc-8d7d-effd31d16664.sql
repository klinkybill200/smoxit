CREATE OR REPLACE FUNCTION public.get_squad_preview(_code text)
RETURNS TABLE(id uuid, name text, goal text, member_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.name, s.goal, (SELECT count(*) FROM public.squad_members m WHERE m.squad_id = s.id)
  FROM public.squads s WHERE s.code = upper(_code) LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_squad_preview(text) TO anon, authenticated;