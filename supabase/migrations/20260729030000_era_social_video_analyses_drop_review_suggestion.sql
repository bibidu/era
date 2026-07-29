-- 去掉「待审核」状态；去掉「修改建议」字段
UPDATE public.era_social_video_analyses
SET publish_status = '待AI修改'
WHERE publish_status = '待审核';

ALTER TABLE public.era_social_video_analyses
  ALTER COLUMN publish_status SET DEFAULT '待AI修改';

ALTER TABLE public.era_social_video_analyses
  DROP CONSTRAINT IF EXISTS era_social_video_analyses_publish_status_check;

ALTER TABLE public.era_social_video_analyses
  ADD CONSTRAINT era_social_video_analyses_publish_status_check
  CHECK (publish_status IN ('已发布', '待AI修改'));

ALTER TABLE public.era_social_video_analyses
  DROP COLUMN IF EXISTS revision_suggestion;
