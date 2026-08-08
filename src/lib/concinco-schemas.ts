import { z } from "zod";

export const nfeItemSchema = z.object({
  sequencia: z.number(),
  codigo: z.string(),
  ean: z.string().default(""),
  referencia: z.string().default(""),
  descricao: z.string(),
  ncm: z.string(),
  cfop: z.string(),
  unidade: z.string(),
  quantidade: z.number(),
  valorUnitario: z.number(),
  valorTotal: z.number(),
  valorIcms: z.number(),
  aliquotaIcms: z.number(),
  valorIpi: z.number(),
  aliquotaIpi: z.number(),
});

export const itemVinculoSchema = z.object({
  sequencia: z.number(),
  codigoInterno: z.string().nullable(),
  descricaoInterna: z.string().nullable(),
  encontradoPor: z.enum(["ean", "referencia"]).nullable(),
  mensagem: z.string().nullable(),
});

export type ItemVinculo = z.infer<typeof itemVinculoSchema>;

export interface ResultadoConsultaItens {
  ok: boolean;
  mensagem: string | null;
  vinculos: ItemVinculo[];
}


export const nfeSchema = z.object({
  arquivo: z.string(),
  chave: z.string(),
  numero: z.string(),
  serie: z.string(),
  dataEmissao: z.string(),
  naturezaOperacao: z.string(),
  emitenteCnpj: z.string(),
  emitenteNome: z.string(),
  emitenteFantasia: z.string(),
  destinatarioCnpj: z.string(),
  destinatarioNome: z.string(),
  valorProdutos: z.number(),
  valorIcmsTotal: z.number(),
  valorIpiTotal: z.number(),
  valorFrete: z.number(),
  valorTotal: z.number(),
  itens: z.array(nfeItemSchema),
});

export const configSchema = z.object({
  baseUrl: z.string().trim().max(500),
  authToken: z.string().trim().max(4000).optional(),
  empresa: z.string().trim().max(60),
  filial: z.string().trim().max(60),
  condicaoPagamento: z.string().trim().max(60),
  tipoPedido: z.string().trim().max(60),
  observacao: z.string().trim().max(500),
});

export type ConfigInput = z.infer<typeof configSchema>;

export interface ConfigView {
  baseUrl: string;
  empresa: string;
  filial: string;
  condicaoPagamento: string;
  tipoPedido: string;
  observacao: string;
  hasToken: boolean;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface EnvioResultado {
  ok: boolean;
  numeroPedido: string | null;
  httpStatus: number | null;
  errorMessage: string | null;
  payload: JsonValue;
  response: JsonValue;
  historyId: string | null;
}

export interface HistoryRow {
  id: string;
  numero_nota: string;
  serie: string;
  chave: string;
  emitente_cnpj: string;
  emitente_nome: string;
  valor_total: number;
  data_emissao: string;
  status: string;
  numero_pedido: string | null;
  http_status: number | null;
  error_message: string | null;
  payload: JsonValue;
  response: JsonValue;
  created_at: string;
}
