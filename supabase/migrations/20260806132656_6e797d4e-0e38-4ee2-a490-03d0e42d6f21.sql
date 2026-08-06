CREATE TABLE public.api_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  base_url text NOT NULL DEFAULT '',
  auth_token text NOT NULL DEFAULT '',
  empresa text NOT NULL DEFAULT '',
  filial text NOT NULL DEFAULT '',
  condicao_pagamento text NOT NULL DEFAULT '',
  tipo_pedido text NOT NULL DEFAULT '',
  observacao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.api_config TO service_role;
ALTER TABLE public.api_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_nota text NOT NULL DEFAULT '',
  serie text NOT NULL DEFAULT '',
  chave text NOT NULL DEFAULT '',
  emitente_cnpj text NOT NULL DEFAULT '',
  emitente_nome text NOT NULL DEFAULT '',
  valor_total numeric NOT NULL DEFAULT 0,
  data_emissao text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'erro',
  numero_pedido text,
  http_status integer,
  error_message text,
  payload jsonb,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.import_history TO service_role;
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX import_history_created_at_idx ON public.import_history (created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER api_config_updated_at BEFORE UPDATE ON public.api_config
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();