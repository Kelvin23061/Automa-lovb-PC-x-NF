import { describe, expect, it } from "vitest";
import { prepararLote } from "./produto-lote";

const base = { fornecedor: "", descricao: "", embalagem: "", tipoCodigo: "" };

describe("prepararLote", () => {
  it("mantém um único registro por código de barras + código interno", () => {
    const r = prepararLote([
      { ...base, seqProduto: "10", codAcesso: "07891234567890", descricao: "A" },
      { ...base, seqProduto: "10", codAcesso: "7891234567890", descricao: "B" },
      { ...base, seqProduto: "11", codAcesso: "7891234567890" },
    ]);
    expect(r).toHaveLength(2);
    expect(r.find((x) => x.seq_produto === "10")?.descricao).toBe("B");
  });
});
