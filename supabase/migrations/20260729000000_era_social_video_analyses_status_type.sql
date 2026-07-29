-- 分析列表：发布状态 + 类型
ALTER TABLE public.era_social_video_analyses
  ADD COLUMN IF NOT EXISTS publish_status text NOT NULL DEFAULT '待审核',
  ADD COLUMN IF NOT EXISTS work_type text NOT NULL DEFAULT '图文';

-- 清洗历史数据：全部视为已发布图文
UPDATE public.era_social_video_analyses
SET
  publish_status = '已发布',
  work_type = '图文';

ALTER TABLE public.era_social_video_analyses
  DROP CONSTRAINT IF EXISTS era_social_video_analyses_publish_status_check;

ALTER TABLE public.era_social_video_analyses
  ADD CONSTRAINT era_social_video_analyses_publish_status_check
  CHECK (publish_status IN ('已发布', '待审核', '待AI修改'));

ALTER TABLE public.era_social_video_analyses
  DROP CONSTRAINT IF EXISTS era_social_video_analyses_work_type_check;

ALTER TABLE public.era_social_video_analyses
  ADD CONSTRAINT era_social_video_analyses_work_type_check
  CHECK (work_type IN ('图文', '风水'));

CREATE INDEX IF NOT EXISTS era_social_video_analyses_publish_status_idx
  ON public.era_social_video_analyses (publish_status);

CREATE INDEX IF NOT EXISTS era_social_video_analyses_work_type_idx
  ON public.era_social_video_analyses (work_type);

DROP POLICY IF EXISTS "era_social_video_analyses_update" ON public.era_social_video_analyses;

CREATE POLICY "era_social_video_analyses_update"
  ON public.era_social_video_analyses FOR UPDATE
  USING (true)
  WITH CHECK (true);
