-- 数据提取状态 + 后台数据图片；停用发布状态字段

ALTER TABLE public.era_social_video_analyses
  ADD COLUMN IF NOT EXISTS extract_status text NOT NULL DEFAULT '未开始',
  ADD COLUMN IF NOT EXISTS extract_images text[] NOT NULL DEFAULT '{}';

UPDATE public.era_social_video_analyses
SET extract_status = '未开始'
WHERE extract_status IS NULL OR extract_status = '';

ALTER TABLE public.era_social_video_analyses
  DROP CONSTRAINT IF EXISTS era_social_video_analyses_extract_status_check;

ALTER TABLE public.era_social_video_analyses
  ADD CONSTRAINT era_social_video_analyses_extract_status_check
  CHECK (extract_status IN ('未开始', '提取中', '提取成功', '提取失败'));

CREATE INDEX IF NOT EXISTS era_social_video_analyses_extract_status_idx
  ON public.era_social_video_analyses (extract_status);

-- 不再使用发布状态
ALTER TABLE public.era_social_video_analyses
  DROP CONSTRAINT IF EXISTS era_social_video_analyses_publish_status_check;

DROP INDEX IF EXISTS era_social_video_analyses_publish_status_idx;

ALTER TABLE public.era_social_video_analyses
  DROP COLUMN IF EXISTS publish_status;
