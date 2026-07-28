DROP POLICY IF EXISTS "era_social_video_analyses_delete" ON public.era_social_video_analyses;

CREATE POLICY "era_social_video_analyses_delete"
  ON public.era_social_video_analyses FOR DELETE
  USING (true);
