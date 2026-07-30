-- 社媒作品类型：新增「健身」，与图文、风水并列
ALTER TABLE public.era_social_video_analyses
  DROP CONSTRAINT IF EXISTS era_social_video_analyses_work_type_check;

ALTER TABLE public.era_social_video_analyses
  ADD CONSTRAINT era_social_video_analyses_work_type_check
  CHECK (work_type IN ('图文', '风水', '健身'));
