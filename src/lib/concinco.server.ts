import type { NfeData, NfeItem } from "./nfe";
import type {
  ConfigInput,
  ConfigView,
  EnvioResultado,
  HistoryRow,
  ItemVinculo,
  JsonValue,
  ResultadoConsultaItens,
} from "./concinco-schemas";
import {
  buildPedidoCompraPayload,
  extractErrorMessage,
  extractNumeroPedido,
} from "./concinco-payload";

const ENDPOINT_PATH = "/PedidoComprasApi/api/v1/PedidoCompras/incluir-pedido-compra";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

interface ConfigRow {
  base_url: string;
  auth_token: string;
  empresa: string;
  filial: string;
  condicao_pagamento: string;
  tipo_pedido: string;
  observacao: string;
  produto_path: string;
  produto_param_ean: string;
  produto_param_referencia: string;
}

const EMPTY_ROW: ConfigRow = {
  base_url: "",
  auth_token: "",
  empresa: "",
  filial: "",
  condicao_pagamento: "",
  tipo_pedido: "",
  observacao: "",
  produto_path: "",
  produto_param_ean: "codigoBarras",
  produto_param_referencia: "referencia",
};

async function loadConfigRow(): Promise<ConfigRow> {
  const db = await admin();
  const { data, error } = await db
    .from("api_config")
    .select(
      "base_url, auth_token, empresa, filial, condicao_pagamento, tipo_pedido, observacao, produto_path, produto_param_ean, produto_param_referencia",
    )
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ConfigRow | null) ?? EMPTY_ROW;
}

function toView(row: ConfigRow): ConfigView {
  return {
    baseUrl: row.base_url,
    empresa: row.empresa,
    filial: row.filial,
    condicaoPagamento: row.condicao_pagamento,
    tipoPedido: row.tipo_pedido,
    observacao: row.observacao,
    produtoPath: row.produto_path,
    produtoParamEan: row.produto_param_ean || "codigoBarras",
    produtoParamReferencia: row.produto_param_referencia || "referencia",
    hasToken: Boolean(row.auth_token),
  };
}

export async function readConfig(): Promise<ConfigView> {
  return toView(await loadConfigRow());
}

export async function writeConfig(input: ConfigInput): Promise<ConfigView> {
  const current = await loadConfigRow();
  const row: ConfigRow = {
    base_url: input.baseUrl.replace(/\/+$/, ""),
    auth_token: input.authToken ? input.authToken : current.auth_token,
    empresa: input.empresa,
    filial: input.filial,
    condicao_pagamento: input.condicaoPagamento,
    tipo_pedido: input.tipoPedido,
    observacao: input.observacao,
    produto_path: input.produtoPath,
    produto_param_ean: input.produtoParamEan || "codigoBarras",
    produto_param_referencia: input.produtoParamReferencia || "referencia",
  };
  const db = await admin();
  const { error } = await db
    .from("api_config")
    .upsert({ singleton: true, ...row }, { onConflict: "singleton" });
  if (error) throw new Error(error.message);
  return toView(row);
}

function buildUrl(baseUrl: string, path = ENDPOINT_PATH): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl.replace(/\/+$/, "")}${suffix}`;
}

function authHeaders(token: string): Record<string, string> {
  if (!token) return {};
  const trimmed = token.trim();
  if (/^(bearer|basic)\s/i.test(trimmed)) return { Authorization: trimmed };
  return { Authorization: `Bearer ${trimmed}`, "x-api-key": trimmed };
}

async function parseBody(response: Response): Promise<JsonValue> {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function testConnection(): Promise<{ ok: boolean; httpStatus: number | null; message: string }> {
  const row = await loadConfigRow();
  if (!row.base_url) {
    return { ok: false, httpStatus: null, message: "Informe a URL base da API antes de testar." };
  }
  try {
    const response = await fetch(buildUrl(row.base_url), {
      method: "OPTIONS",
      headers: authHeaders(row.auth_token),
    });
    return {
      ok: response.status < 500,
      httpStatus: response.status,
      message:
        response.status < 500
          ? `Endpoint respondeu com HTTP ${response.status}. A URL está acessível.`
          : `O servidor respondeu com HTTP ${response.status}.`,
    };
  } catch (error) {
    return {
      ok: false,
      httpStatus: null,
      message: `Não foi possível alcançar a API: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

const CODIGO_KEYS = [
  "codigointerno",
  "codigo_interno",
  "codigoproduto",
  "codigo_produto",
  "codproduto",
  "codigoempresa",
  "codigo",
  "idproduto",
  "produto",
];

const DESCRICAO_KEYS = ["descricao", "descricaoproduto", "nome", "xprod", "descricaocompleta"];

function findValue(value: unknown, keys: string[], depth = 0): string | null {
  if (depth > 6 || value == null) return null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findValue(entry, keys, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (keys.includes(key.toLowerCase())) {
      const raw = record[key];
      if (typeof raw === "string" && raw.trim()) return raw.trim();
      if (typeof raw === "number") return String(raw);
    }
  }
  for (const key of Object.keys(record)) {
    const found = findValue(record[key], keys, depth + 1);
    if (found) return found;
  }
  return null;
}

async function consultarProduto(
  row: ConfigRow,
  param: string,
  value: string,
): Promise<{ codigo: string | null; descricao: string | null; mensagem: string | null }> {
  const url = new URL(buildUrl(row.base_url, row.produto_path));
  url.searchParams.set(param, value);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json", ...authHeaders(row.auth_token) },
    });
    if (res.status === 404) return { codigo: null, descricao: null, mensagem: null };
    const body = await parseBody(res);
    if (!res.ok) {
      return {
        codigo: null,
        descricao: null,
        mensagem: extractErrorMessage(body, `A API respondeu com HTTP ${res.status}.`),
      };
    }
    return {
      codigo: findValue(body, CODIGO_KEYS),
      descricao: findValue(body, DESCRICAO_KEYS),
      mensagem: null,
    };
  } catch (error) {
    return {
      codigo: null,
      descricao: null,
      mensagem: `Falha de comunicação com a API: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

import { normalizarCodigo } from "./produto-lote";
export { normalizarCodigo };

interface ProdutoBase {
  seq_produto: string;
  cod_acesso: string;
  descricao: string;
  embalagem: string;
}

async function buscarNaBase(codigos: string[]): Promise<Map<string, ProdutoBase[]>> {
  const mapa = new Map<string, ProdutoBase[]>();
  if (!codigos.length) return mapa;
  const db = await admin();
  const { data, error } = await db
    .from("produto_codigo_barras")
    .select("seq_produto, cod_acesso, descricao, embalagem")
    .in("cod_acesso", codigos)
    .order("id");
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as ProdutoBase[]) {
    const lista = mapa.get(row.cod_acesso) ?? [];
    if (!lista.some((p) => p.seq_produto === row.seq_produto)) lista.push(row);
    mapa.set(row.cod_acesso, lista);
  }
  return mapa;
}

export async function consultarItens(itens: NfeItem[]): Promise<ResultadoConsultaItens> {
  const row = await loadConfigRow();
  const codigos = [...new Set(itens.map((i) => normalizarCodigo(i.ean)).filter(Boolean))];
  const base = await buscarNaBase(codigos);
  const apiDisponivel = Boolean(row.base_url && row.produto_path);

  const vinculos: ItemVinculo[] = [];
  for (const item of itens) {
    const achados = base.get(normalizarCodigo(item.ean));
    if (achados?.length) {
      const p = achados[0]!;
      vinculos.push({
        sequencia: item.sequencia,
        codigoInterno: p.seq_produto,
        descricaoInterna: p.descricao || null,
        embalagem: p.embalagem || null,
        encontradoPor: "planilha",
        mensagem:
          achados.length > 1
            ? `Código duplicado na base (${achados.map((a) => a.seq_produto).join(", ")}). Usado o primeiro.`
            : null,
      });
      continue;
    }

    if (!apiDisponivel) {
      vinculos.push({
        sequencia: item.sequencia,
        codigoInterno: null,
        descricaoInterna: null,
        embalagem: null,
        encontradoPor: null,
        mensagem: item.ean
          ? "Código de barras não encontrado na base de produtos."
          : "Item sem código de barras na nota.",
      });
      continue;
    }

    let resultado = { codigo: null as string | null, descricao: null as string | null, mensagem: null as string | null };
    let encontradoPor: ItemVinculo["encontradoPor"] = null;
    if (item.ean) {
      resultado = await consultarProduto(row, row.produto_param_ean || "codigoBarras", item.ean);
      if (resultado.codigo) encontradoPor = "ean";
    }
    if (!resultado.codigo && item.referencia) {
      const porReferencia = await consultarProduto(
        row,
        row.produto_param_referencia || "referencia",
        item.referencia,
      );
      if (porReferencia.codigo) {
        resultado = porReferencia;
        encontradoPor = "referencia";
      } else if (!resultado.mensagem) {
        resultado = porReferencia;
      }
    }
    vinculos.push({
      sequencia: item.sequencia,
      codigoInterno: resultado.codigo,
      descricaoInterna: resultado.descricao,
      embalagem: null,
      encontradoPor,
      mensagem: resultado.codigo ? null : resultado.mensagem,
    });
  }

  return { ok: true, mensagem: null, vinculos };
}

export interface BaseProdutosInfo {
  total: number;
  arquivo: string | null;
  atualizadoEm: string | null;
}

export async function readBaseInfo(): Promise<BaseProdutosInfo> {
  const db = await admin();
  const { count } = await db
    .from("produto_codigo_barras")
    .select("id", { count: "exact", head: true });
  const { data } = await db
    .from("produto_base_info")
    .select("arquivo, updated_at")
    .eq("singleton", true)
    .maybeSingle();
  const info = data as { arquivo: string; updated_at: string } | null;
  return { total: count ?? 0, arquivo: info?.arquivo || null, atualizadoEm: info?.updated_at ?? null };
}

export interface LinhaProduto {
  seqProduto: string;
  fornecedor: string;
  codAcesso: string;
  descricao: string;
  embalagem: string;
  tipoCodigo: string;
}

export async function importarLoteProdutos(
  linhas: LinhaProduto[],
  substituir: boolean,
  arquivo: string,
): Promise<{ inseridos: number; novos: number; atualizados: number }> {
  const { prepararLote } = await import("./produto-lote");
  const db = await admin();
  if (substituir) {
    const { error } = await db.from("produto_codigo_barras").delete().gte("id", 0);
    if (error) throw new Error(error.message);
  }
  const rows = prepararLote(linhas);
  let existentes = 0;
  if (rows.length && !substituir) {
    const codigos = [...new Set(rows.map((r) => r.cod_acesso))];
    const chaves = new Set(rows.map((r) => `${r.cod_acesso}|${r.seq_produto}`));
    for (let i = 0; i < codigos.length; i += 500) {
      const { data, error } = await db
        .from("produto_codigo_barras")
        .select("cod_acesso, seq_produto")
        .in("cod_acesso", codigos.slice(i, i + 500));
      if (error) throw new Error(error.message);
      for (const d of data ?? []) if (chaves.has(`${d.cod_acesso}|${d.seq_produto}`)) existentes++;
    }
  }
  if (rows.length) {
    const { error } = await db
      .from("produto_codigo_barras")
      .upsert(rows, { onConflict: "cod_acesso,seq_produto" });
    if (error) throw new Error(error.message);
  }
  await db
    .from("produto_base_info")
    .upsert({ singleton: true, arquivo, updated_at: new Date().toISOString() }, { onConflict: "singleton" });
  return { inseridos: rows.length, novos: rows.length - existentes, atualizados: existentes };
}

export async function enviarPedido(
  nfe: NfeData,
  codigosInternos: Record<number, string | null> = {},
): Promise<EnvioResultado> {
  const row = await loadConfigRow();
  const payload = buildPedidoCompraPayload(
    nfe,
    {
      empresa: row.empresa,
      filial: row.filial,
      condicaoPagamento: row.condicao_pagamento,
      tipoPedido: row.tipo_pedido,
      observacao: row.observacao,
    },
    codigosInternos,
  );

  const pendentes = nfe.itens.filter((item) => !codigosInternos[item.sequencia]);
  if (pendentes.length > 0) {
    return {
      ok: false,
      numeroPedido: null,
      httpStatus: null,
      errorMessage: `Existem ${pendentes.length} item(ns) sem cadastro na empresa. Cadastre-os na Concinco e atualize os vínculos antes de gerar o pedido.`,
      payload: payload as unknown as JsonValue,
      response: null,
      historyId: null,
    };
  }

  if (!row.base_url) {
    return {
      ok: false,
      numeroPedido: null,
      httpStatus: null,
      errorMessage: "URL base da API Concinco não configurada. Acesse Configurações.",
      payload: payload as unknown as JsonValue,
      response: null,
      historyId: null,
    };
  }

  let httpStatus: number | null = null;
  let response: JsonValue = null;
  let ok = false;
  let errorMessage: string | null = null;
  let numeroPedido: string | null = null;

  try {
    const res = await fetch(buildUrl(row.base_url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...authHeaders(row.auth_token),
      },
      body: JSON.stringify(payload),
    });
    httpStatus = res.status;
    response = await parseBody(res);
    ok = res.ok;
    if (ok) {
      numeroPedido = extractNumeroPedido(response);
      if (!numeroPedido) {
        errorMessage = null;
      }
    } else {
      errorMessage = extractErrorMessage(response, `A API respondeu com HTTP ${res.status}.`);
    }
  } catch (error) {
    errorMessage = `Falha de comunicação com a API: ${error instanceof Error ? error.message : String(error)}`;
  }

  let historyId: string | null = null;
  try {
    const db = await admin();
    const { data } = await db
      .from("import_history")
      .insert({
        numero_nota: nfe.numero,
        serie: nfe.serie,
        chave: nfe.chave,
        emitente_cnpj: nfe.emitenteCnpj,
        emitente_nome: nfe.emitenteNome,
        valor_total: nfe.valorTotal,
        data_emissao: nfe.dataEmissao,
        status: ok ? "sucesso" : "erro",
        numero_pedido: numeroPedido,
        http_status: httpStatus,
        error_message: errorMessage,
        payload: JSON.parse(JSON.stringify(payload)),
        response: response == null ? null : JSON.parse(JSON.stringify(response)),
      })
      .select("id")
      .maybeSingle();
    historyId = (data as { id: string } | null)?.id ?? null;
  } catch (error) {
    console.error("Falha ao gravar histórico", error);
  }

  return {
    ok,
    numeroPedido,
    httpStatus,
    errorMessage,
    payload: payload as unknown as JsonValue,
    response,
    historyId,
  };
}

export async function readHistory(): Promise<HistoryRow[]> {
  const db = await admin();
  const { data, error } = await db
    .from("import_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as HistoryRow[];
}
