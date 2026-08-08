ALTER TABLE public.api_config
  ADD COLUMN IF NOT EXISTS produto_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS produto_param_ean text NOT NULL DEFAULT 'codigoBarras',
  ADD COLUMN IF NOT EXISTS produto_param_referencia text NOT NULL DEFAULT 'referencia';