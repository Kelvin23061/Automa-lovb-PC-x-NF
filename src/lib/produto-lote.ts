export function normalizarCodigo(value: string | number | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "").replace(/^0+/, "");
}

export interface LinhaProdutoNormalizada {
  seq_produto: string;
  fornecedor: string;
  cod_acesso: string;
  descricao: string;
  embalagem: string;
  tipo_codigo: string;
}

/** Normaliza e remove pares (código de barras + código interno) repetidos; a última linha vence. */
export function prepararLote(
  linhas: { seqProduto: string; fornecedor: string; codAcesso: string; descricao: string; embalagem: string; tipoCodigo: string }[],
): LinhaProdutoNormalizada[] {
  const mapa = new Map<string, LinhaProdutoNormalizada>();
  for (const l of linhas) {
    const r = {
      seq_produto: l.seqProduto.trim(),
      fornecedor: l.fornecedor,
      cod_acesso: normalizarCodigo(l.codAcesso),
      descricao: l.descricao,
      embalagem: l.embalagem,
      tipo_codigo: l.tipoCodigo,
    };
    if (r.seq_produto && r.cod_acesso) mapa.set(`${r.cod_acesso}|${r.seq_produto}`, r);
  }
  return [...mapa.values()];
}
