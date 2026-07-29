-- 创建帖：大纲
ALTER TABLE public.era_social_video_analyses
  ADD COLUMN IF NOT EXISTS outline text NOT NULL DEFAULT '';

UPDATE public.era_social_video_analyses
SET outline = ''
WHERE outline IS NULL;
