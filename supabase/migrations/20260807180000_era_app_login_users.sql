-- 极简应用登录账号（账号 + 密码 → auth_hash 存 cookie）
CREATE TABLE IF NOT EXISTS public.era_app_login_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  auth_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.era_app_login_users ENABLE ROW LEVEL SECURITY;

-- 不开放 anon 直读表；仅通过 SECURITY DEFINER 函数访问
CREATE OR REPLACE FUNCTION public.era_app_login(p_username text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.era_app_login_users%ROWTYPE;
BEGIN
  SELECT * INTO rec
  FROM public.era_app_login_users
  WHERE username = p_username AND password = p_password
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false);
  END IF;
  RETURN json_build_object('ok', true, 'authHash', rec.auth_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.era_app_auth_valid(p_hash text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.era_app_login_users WHERE auth_hash = p_hash LIMIT 1
  );
$$;

GRANT EXECUTE ON FUNCTION public.era_app_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.era_app_auth_valid(text) TO anon;

INSERT INTO public.era_app_login_users (username, password, auth_hash)
VALUES (
  '17718139319',
  '521312',
  encode(digest('17718139319:521312', 'sha256'), 'hex')
)
ON CONFLICT (username) DO UPDATE
SET password = EXCLUDED.password,
    auth_hash = EXCLUDED.auth_hash;
