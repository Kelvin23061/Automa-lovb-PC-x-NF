import type { NfeData } from "./nfe";

export interface PedidoConfig {
  empresa: string;
  filial: string;
  condicaoPagamento: string;
  tipoPedido: string;
  observacao: string;
}

export interface PedidoCompraPayload {
  cabecalho: Record<string, unknown>;
  itens: Record<string, unknown>[];
}

/**
 * Mapeamento único entre o XML da NF-e e o payload esperado pelo endpoint
 * `POST {baseUrl}/PedidoComprasApi/api/v1/PedidoCompras/incluir-pedido-compra`.
 * Ajuste apenas este arquivo quando o contrato oficial da Concinco for confirmado.
 */
export function buildPedidoCompraPayload(
  nfe: NfeData,
  config: PedidoConfig,
  codigosInternos: Record<number, string | null> = {},
): PedidoCompraPayload {
  const round = (value: number) => Math.round(value * 100) / 100;

  return {
    cabecalho: {
      empresa: config.empresa,
      filial: config.filial,
      cnpjFornecedor: nfe.emitenteCnpj,
      nomeFornecedor: nfe.emitenteNome,
      numeroNota: nfe.numero,
      serieNota: nfe.serie,
      chaveNfe: nfe.chave,
      dataEmissao: nfe.dataEmissao,
      naturezaOperacao: nfe.naturezaOperacao,
      condicaoPagamento: config.condicaoPagamento,
      tipoPedido: config.tipoPedido,
      valorProdutos: round(nfe.valorProdutos),
      valorIcms: round(nfe.valorIcmsTotal),
      valorIpi: round(nfe.valorIpiTotal),
      valorFrete: round(nfe.valorFrete),
      valorTotal: round(nfe.valorTotal),
      quantidadeItens: nfe.itens.length,
      observacao:
        config.observacao ||
        `Pedido gerado automaticamente a partir da NF-e ${nfe.numero}/${nfe.serie}.`,
    },
    itens: nfe.itens.map((item) => ({
      sequencia: item.sequencia,
      codigoProduto: codigosInternos[item.sequencia] ?? item.codigo,
      codigoInternoProduto: codigosInternos[item.sequencia] ?? null,
      codigoFornecedor: item.codigo,
      codigoBarras: item.ean,
      referenciaFornecedor: item.referencia,
      descricao: item.descricao,
      ncm: item.ncm,
      cfop: item.cfop,
      unidade: item.unidade,
      quantidade: item.quantidade,
      valorUnitario: round(item.valorUnitario),
      valorTotal: round(item.valorTotal),
      aliquotaIcms: item.aliquotaIcms,
      valorIcms: round(item.valorIcms),
      aliquotaIpi: item.aliquotaIpi,
      valorIpi: round(item.valorIpi),
    })),
  };
}


const PEDIDO_KEYS = [
  "numeropedido",
  "numero_pedido",
  "nropedido",
  "numero",
  "pedido",
  "codigopedido",
  "idpedido",
];

/** Procura o número do pedido em qualquer nível da resposta da API. */
export function extractNumeroPedido(response: unknown): string | null {
  const visit = (value: unknown, depth: number): string | null => {
    if (depth > 6 || value == null) return null;
    if (Array.isArray(value)) {
      for (const entry of value) {
        const found = visit(entry, depth + 1);
        if (found) return found;
      }
      return null;
    }
    if (typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (PEDIDO_KEYS.includes(key.toLowerCase())) {
        const raw = record[key];
        if (typeof raw === "string" && raw.trim()) return raw.trim();
        if (typeof raw === "number") return String(raw);
      }
    }
    for (const key of Object.keys(record)) {
      const found = visit(record[key], depth + 1);
      if (found) return found;
    }
    return null;
  };

  return visit(response, 0);
}

/** Extrai a mensagem de erro mais útil retornada pelo servidor. */
export function extractErrorMessage(response: unknown, fallback: string): string {
  if (typeof response === "string" && response.trim()) return response.trim();
  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>;
    for (const key of ["message", "mensagem", "erro", "error", "detail", "title"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    const errors = record["errors"];
    if (errors && typeof errors === "object") {
      const parts = Object.entries(errors as Record<string, unknown>).map(
        ([field, detail]) =>
          `${field}: ${Array.isArray(detail) ? detail.join(", ") : String(detail)}`,
      );
      if (parts.length) return parts.join(" | ");
    }
    try {
      return JSON.stringify(response);
    } catch {
      return fallback;
    }
  }
  return fallback;
}
