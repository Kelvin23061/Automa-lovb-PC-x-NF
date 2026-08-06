import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listarHistorico } from "@/lib/concinco.functions";
import type { HistoryRow } from "@/lib/concinco-schemas";
import { formatCnpj, formatMoney } from "@/lib/nfe";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de pedidos gerados | Automação Fiscal" },
      {
        name: "description",
        content:
          "Acompanhe todas as notas importadas, o status do envio à Concinco e o número do pedido de compras gerado.",
      },
      { property: "og:title", content: "Histórico de pedidos gerados | Automação Fiscal" },
      {
        property: "og:description",
        content:
          "Painel de status com retorno da API Concinco, mensagens de erro e número do pedido de compras.",
      },
    ],
  }),
  component: HistoricoPage,
});

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function HistoricoPage() {
  const fetchHistory = useServerFn(listarHistorico);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["history"],
    queryFn: () => fetchHistory(),
  });

  const rows: HistoryRow[] = data ?? [];
  const enviados = rows.filter((row) => row.status === "sucesso").length;
  const falhas = rows.length - enviados;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Histórico de envios
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Todas as notas processadas, com o retorno da API da Concinco e o número do pedido de
            compras gerado.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Notas processadas" value={rows.length} />
        <SummaryCard label="Pedidos gerados" value={enviados} tone="success" />
        <SummaryCard label="Envios com erro" value={falhas} tone="destructive" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Registros</CardTitle>
          <CardDescription>Ordenados do mais recente para o mais antigo.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {isLoading ? (
            <div className="flex items-center gap-2 px-6 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando histórico…
            </div>
          ) : rows.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Nenhum envio registrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>NF-e</TableHead>
                    <TableHead className="min-w-48">Fornecedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead className="min-w-64">Retorno</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(row.created_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium">
                        {row.numero_nota}/{row.serie}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {row.chave}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="block truncate" title={row.emitente_nome}>
                          {row.emitente_nome}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatCnpj(row.emitente_cnpj)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {formatMoney(row.valor_total)}
                      </TableCell>
                      <TableCell>
                        {row.status === "sucesso" ? (
                          <Badge className="bg-success text-success-foreground">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Sucesso
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Erro
                          </Badge>
                        )}
                        {row.http_status !== null && (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            HTTP {row.http_status}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {row.numero_pedido ?? "-"}
                      </TableCell>
                      <TableCell className="max-w-80 text-xs text-muted-foreground">
                        <span className="block break-words">{row.error_message ?? "OK"}</span>
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "destructive";
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="py-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-3xl font-semibold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
