CREATE TABLE IF NOT EXISTS public.era_social_video_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL DEFAULT '',
  published_at text NOT NULL DEFAULT '',
  cover_url text,
  markdown text NOT NULL
);

ALTER TABLE public.era_social_video_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "era_social_video_analyses_select" ON public.era_social_video_analyses;
DROP POLICY IF EXISTS "era_social_video_analyses_insert" ON public.era_social_video_analyses;

CREATE POLICY "era_social_video_analyses_select"
  ON public.era_social_video_analyses FOR SELECT
  USING (true);

CREATE POLICY "era_social_video_analyses_insert"
  ON public.era_social_video_analyses FOR INSERT
  WITH CHECK (true);
