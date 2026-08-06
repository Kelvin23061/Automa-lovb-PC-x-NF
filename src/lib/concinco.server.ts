import type { NfeData } from "./nfe";
import type {
  ConfigInput,
  ConfigView,
  EnvioResultado,
  HistoryRow,
  JsonValue,
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
}

const EMPTY_ROW: ConfigRow = {
  base_url: "",
  auth_token: "",
  empresa: "",
  filial: "",
  condicao_pagamento: "",
  tipo_pedido: "",
  observacao: "",
};

async function loadConfigRow(): Promise<ConfigRow> {
  const db = await admin();
  const { data, error } = await db
    .from("api_config")
    .select("base_url, auth_token, empresa, filial, condicao_pagamento, tipo_pedido, observacao")
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
  };
  const db = await admin();
  const { error } = await db
    .from("api_config")
    .upsert({ singleton: true, ...row }, { onConflict: "singleton" });
  if (error) throw new Error(error.message);
  return toView(row);
}

function buildUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${ENDPOINT_PATH}`;
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

export async function enviarPedido(nfe: NfeData): Promise<EnvioResultado> {
  const row = await loadConfigRow();
  const payload = buildPedidoCompraPayload(nfe, {
    empresa: row.empresa,
    filial: row.filial,
    condicaoPagamento: row.condicao_pagamento,
    tipoPedido: row.tipo_pedido,
    observacao: row.observacao,
  });

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
