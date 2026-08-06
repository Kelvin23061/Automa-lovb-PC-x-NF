import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCnpj, formatDate, formatMoney, formatNumber, type NfeData } from "@/lib/nfe";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium text-foreground" title={value}>
        {value || "-"}
      </dd>
    </div>
  );
}

export function NfePreview({ nfe }: { nfe: NfeData }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">Dados da nota fiscal</CardTitle>
          <Badge variant="secondary">{nfe.arquivo}</Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Número" value={nfe.numero} />
            <Field label="Série" value={nfe.serie} />
            <Field label="Emissão" value={formatDate(nfe.dataEmissao)} />
            <Field label="Valor total" value={formatMoney(nfe.valorTotal)} />
            <Field label="CNPJ emitente" value={formatCnpj(nfe.emitenteCnpj)} />
            <Field label="Emitente" value={nfe.emitenteNome} />
            <Field label="CNPJ destinatário" value={formatCnpj(nfe.destinatarioCnpj)} />
            <Field label="Destinatário" value={nfe.destinatarioNome} />
            <Field label="Natureza da operação" value={nfe.naturezaOperacao} />
            <Field label="ICMS total" value={formatMoney(nfe.valorIcmsTotal)} />
            <Field label="IPI total" value={formatMoney(nfe.valorIpiTotal)} />
            <Field label="Chave da NF-e" value={nfe.chave} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Itens da nota
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({nfe.itens.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="min-w-56">Descrição</TableHead>
                  <TableHead>Un.</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Vlr. unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">ICMS</TableHead>
                  <TableHead className="text-right">IPI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nfe.itens.map((item) => (
                  <TableRow key={`${item.sequencia}-${item.codigo}`}>
                    <TableCell className="text-muted-foreground">{item.sequencia}</TableCell>
                    <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                    <TableCell className="max-w-80">
                      <span className="block truncate" title={item.descricao}>
                        {item.descricao}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        NCM {item.ncm || "-"} · CFOP {item.cfop || "-"}
                      </span>
                    </TableCell>
                    <TableCell>{item.unidade}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.quantidade)}</TableCell>
                    <TableCell className="text-right">{formatMoney(item.valorUnitario)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(item.valorTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(item.valorIcms)}
                      <span className="block text-xs text-muted-foreground">
                        {formatNumber(item.aliquotaIcms, 2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(item.valorIpi)}
                      <span className="block text-xs text-muted-foreground">
                        {formatNumber(item.aliquotaIpi, 2)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
