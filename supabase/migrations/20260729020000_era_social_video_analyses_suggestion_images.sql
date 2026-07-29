-- 修改建议 + 图片预览（多图 URL）
ALTER TABLE public.era_social_video_analyses
  ADD COLUMN IF NOT EXISTS revision_suggestion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_previews text[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.era_social_video_analyses
SET
  revision_suggestion = COALESCE(revision_suggestion, ''),
  image_previews = COALESCE(image_previews, '{}'::text[]);
