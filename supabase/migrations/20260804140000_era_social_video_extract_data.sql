-- 提取结果与帖子正文分离：extract_data 存后台数据，markdown 只存内容

ALTER TABLE public.era_social_video_analyses
  ADD COLUMN IF NOT EXISTS extract_data text NOT NULL DEFAULT '';

-- 历史：曾把提取 JSON 写进 markdown 的行，迁到 extract_data
UPDATE public.era_social_video_analyses
SET extract_data = markdown
WHERE (extract_data IS NULL OR btrim(extract_data) = '')
  AND btrim(markdown) LIKE '{%'
  AND extract_status IN ('提取成功', '提取失败', '提取中');

-- 已迁走的 JSON 不再占内容字段
UPDATE public.era_social_video_analyses
SET markdown = ''
WHERE btrim(extract_data) <> ''
  AND btrim(markdown) = btrim(extract_data)
  AND btrim(markdown) LIKE '{%';
