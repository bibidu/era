-- 临时数据治理状态（用完后整字段删除）
-- 值：未治理 / 正在治理 / 治理成功 / 治理失败

ALTER TABLE public.era_social_video_analyses
  ADD COLUMN IF NOT EXISTS temp_govern_status text NOT NULL DEFAULT '未治理';

UPDATE public.era_social_video_analyses
SET temp_govern_status = '未治理'
WHERE temp_govern_status IS NULL OR temp_govern_status = '';

ALTER TABLE public.era_social_video_analyses
  DROP CONSTRAINT IF EXISTS era_social_video_analyses_temp_govern_status_check;

ALTER TABLE public.era_social_video_analyses
  ADD CONSTRAINT era_social_video_analyses_temp_govern_status_check
  CHECK (temp_govern_status IN ('未治理', '正在治理', '治理成功', '治理失败'));

CREATE INDEX IF NOT EXISTS era_social_video_analyses_temp_govern_status_idx
  ON public.era_social_video_analyses (temp_govern_status);
