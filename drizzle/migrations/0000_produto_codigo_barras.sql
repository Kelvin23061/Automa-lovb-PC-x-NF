CREATE TABLE public.produto_codigo_barras (
  id bigserial PRIMARY KEY,
  seq_produto text NOT NULL,
  fornecedor text NOT NULL DEFAULT '',
  cod_acesso text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  embalagem text NOT NULL DEFAULT '',
  tipo_codigo text NOT NULL DEFAULT ''
);
CREATE INDEX produto_codigo_barras_cod_idx ON public.produto_codigo_barras (cod_acesso);
GRANT ALL ON public.produto_codigo_barras TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.produto_codigo_barras_id_seq TO service_role;
ALTER TABLE public.produto_codigo_barras ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.produto_base_info (
  singleton boolean PRIMARY KEY DEFAULT true,
  total integer NOT NULL DEFAULT 0,
  arquivo text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.produto_base_info TO service_role;
ALTER TABLE public.produto_base_info ENABLE ROW LEVEL SECURITY;