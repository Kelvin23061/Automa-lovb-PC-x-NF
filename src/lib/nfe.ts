export interface NfeItem {
  sequencia: number;
  codigo: string;
  ean: string;
  referencia: string;
  descricao: string;

  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  valorIcms: number;
  aliquotaIcms: number;
  valorIpi: number;
  aliquotaIpi: number;
}

export interface NfeData {
  arquivo: string;
  chave: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  naturezaOperacao: string;
  emitenteCnpj: string;
  emitenteNome: string;
  emitenteFantasia: string;
  destinatarioCnpj: string;
  destinatarioNome: string;
  valorProdutos: number;
  valorIcmsTotal: number;
  valorIpiTotal: number;
  valorFrete: number;
  valorTotal: number;
  itens: NfeItem[];
}

function text(node: Element | null | undefined, tag: string): string {
  if (!node) return "";
  const el = node.getElementsByTagName(tag)[0] ?? node.getElementsByTagName(`nfe:${tag}`)[0];
  return el?.textContent?.trim() ?? "";
}

function num(node: Element | null | undefined, tag: string): number {
  const value = text(node, tag);
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) return value;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNumber(value: number, digits = 4): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  });
}

export function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

export class NfeParseError extends Error {}

export function parseNfeXml(xml: string, arquivo: string): NfeData {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new NfeParseError("Arquivo XML inválido ou corrompido.");
  }

  const infNFe =
    doc.getElementsByTagName("infNFe")[0] ?? doc.getElementsByTagName("nfe:infNFe")[0] ?? null;
  if (!infNFe) {
    throw new NfeParseError("Não encontramos os dados da NF-e neste arquivo (tag infNFe ausente).");
  }

  const ide = infNFe.getElementsByTagName("ide")[0] ?? null;
  const emit = infNFe.getElementsByTagName("emit")[0] ?? null;
  const dest = infNFe.getElementsByTagName("dest")[0] ?? null;
  const icmsTot = infNFe.getElementsByTagName("ICMSTot")[0] ?? null;

  const chave = (infNFe.getAttribute("Id") ?? "").replace(/^NFe/, "");

  const detNodes = Array.from(infNFe.getElementsByTagName("det"));
  const itens: NfeItem[] = detNodes.map((det, index) => {
    const prod = det.getElementsByTagName("prod")[0] ?? null;
    const icmsNode =
      det.getElementsByTagName("ICMS00")[0] ??
      det.getElementsByTagName("ICMS10")[0] ??
      det.getElementsByTagName("ICMS20")[0] ??
      det.getElementsByTagName("ICMS51")[0] ??
      det.getElementsByTagName("ICMS70")[0] ??
      det.getElementsByTagName("ICMS90")[0] ??
      det.getElementsByTagName("ICMS")[0] ??
      null;
    const ipiNode = det.getElementsByTagName("IPITrib")[0] ?? det.getElementsByTagName("IPI")[0] ?? null;

    return {
      sequencia: Number(det.getAttribute("nItem") ?? index + 1),
      codigo: text(prod, "cProd"),
      ean: (() => {
        const ean = text(prod, "cEAN") || text(prod, "cEANTrib") || text(prod, "cBarra");
        return /^\d{8,14}$/.test(ean) ? ean : "";
      })(),
      referencia: text(prod, "cProd"),

      descricao: text(prod, "xProd"),
      ncm: text(prod, "NCM"),
      cfop: text(prod, "CFOP"),
      unidade: text(prod, "uCom"),
      quantidade: num(prod, "qCom"),
      valorUnitario: num(prod, "vUnCom"),
      valorTotal: num(prod, "vProd"),
      valorIcms: num(icmsNode, "vICMS"),
      aliquotaIcms: num(icmsNode, "pICMS"),
      valorIpi: num(ipiNode, "vIPI"),
      aliquotaIpi: num(ipiNode, "pIPI"),
    };
  });

  return {
    arquivo,
    chave,
    numero: text(ide, "nNF"),
    serie: text(ide, "serie"),
    dataEmissao: text(ide, "dhEmi") || text(ide, "dEmi"),
    naturezaOperacao: text(ide, "natOp"),
    emitenteCnpj: text(emit, "CNPJ") || text(emit, "CPF"),
    emitenteNome: text(emit, "xNome"),
    emitenteFantasia: text(emit, "xFant"),
    destinatarioCnpj: text(dest, "CNPJ") || text(dest, "CPF"),
    destinatarioNome: text(dest, "xNome"),
    valorProdutos: num(icmsTot, "vProd"),
    valorIcmsTotal: num(icmsTot, "vICMS"),
    valorIpiTotal: num(icmsTot, "vIPI"),
    valorFrete: num(icmsTot, "vFrete"),
    valorTotal: num(icmsTot, "vNF"),
    itens,
  };
}
