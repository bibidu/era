-- 亏否：个人资产 / 使用成本清单
-- 应用已拆到独立仓库 bibidu/kuifou（线上 https://39.106.179.17.sslip.io/kuifou/），
-- 本迁移仍保留以便历史/新环境可复现表结构；共享 PostgREST，切勿 drop 此表。
CREATE TABLE IF NOT EXISTS public.kuifou_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '📦',
  category text NOT NULL DEFAULT '其他',
  subcategory text NOT NULL DEFAULT '',
  purchase_price numeric(14, 2) NOT NULL DEFAULT 0,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT '使用中'
    CHECK (status IN ('使用中', '闲置', '已出售', '已赠出')),
  under_warranty boolean NOT NULL DEFAULT false,
  warranty_until date,
  usage_count integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  billing_mode text NOT NULL DEFAULT '日均'
    CHECK (billing_mode IN ('日均', '按次')),
  residual_rate numeric(6, 4) NOT NULL DEFAULT 0.3500,
  notes text NOT NULL DEFAULT '',
  is_demo boolean NOT NULL DEFAULT false,
  source_list text NOT NULL DEFAULT 'user'
);

CREATE INDEX IF NOT EXISTS kuifou_assets_sort_idx
  ON public.kuifou_assets (sort_order ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS kuifou_assets_category_idx
  ON public.kuifou_assets (category, subcategory);

ALTER TABLE public.kuifou_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kuifou_assets_select" ON public.kuifou_assets;
DROP POLICY IF EXISTS "kuifou_assets_insert" ON public.kuifou_assets;
DROP POLICY IF EXISTS "kuifou_assets_update" ON public.kuifou_assets;
DROP POLICY IF EXISTS "kuifou_assets_delete" ON public.kuifou_assets;

CREATE POLICY "kuifou_assets_select"
  ON public.kuifou_assets FOR SELECT
  USING (true);

CREATE POLICY "kuifou_assets_insert"
  ON public.kuifou_assets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "kuifou_assets_update"
  ON public.kuifou_assets FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "kuifou_assets_delete"
  ON public.kuifou_assets FOR DELETE
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kuifou_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kuifou_assets TO era;

CREATE OR REPLACE FUNCTION public.kuifou_assets_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kuifou_assets_updated_at ON public.kuifou_assets;
CREATE TRIGGER kuifou_assets_updated_at
  BEFORE UPDATE ON public.kuifou_assets
  FOR EACH ROW
  EXECUTE PROCEDURE public.kuifou_assets_set_updated_at();
