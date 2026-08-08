import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save, Wifi } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getConfig, saveConfig, testarConexao } from "@/lib/concinco.functions";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações da API Concinco | Automação Fiscal" },
      {
        name: "description",
        content:
          "Configure a URL base, o token de autenticação e os parâmetros padrão do pedido de compras da Concinco.",
      },
      { property: "og:title", content: "Configurações da API Concinco | Automação Fiscal" },
      {
        property: "og:description",
        content:
          "Parâmetros de conexão com o módulo de compras da Concinco, com token guardado em segurança no servidor.",
      },
    ],
  }),
  component: ConfiguracoesPage,
});

const EMPTY = {
  baseUrl: "",
  authToken: "",
  empresa: "",
  filial: "",
  condicaoPagamento: "",
  tipoPedido: "",
  observacao: "",
  produtoPath: "",
  produtoParamEan: "codigoBarras",
  produtoParamReferencia: "referencia",
};


function ConfiguracoesPage() {
  const fetchConfig = useServerFn(getConfig);
  const persistConfig = useServerFn(saveConfig);
  const testConfig = useServerFn(testarConexao);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["config"],
    queryFn: () => fetchConfig(),
  });

  const [form, setForm] = useState(EMPTY);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    httpStatus: number | null;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!data) return;
    setForm({
      baseUrl: data.baseUrl,
      authToken: "",
      empresa: data.empresa,
      filial: data.filial,
      condicaoPagamento: data.condicaoPagamento,
      tipoPedido: data.tipoPedido,
      observacao: data.observacao,
      produtoPath: data.produtoPath,
      produtoParamEan: data.produtoParamEan,
      produtoParamReferencia: data.produtoParamReferencia,

    });
  }, [data]);

  const save = useMutation({
    mutationFn: () => persistConfig({ data: form }),
    onSuccess: () => {
      toast.success("Configurações salvas.");
      setForm((prev) => ({ ...prev, authToken: "" }));
      void queryClient.invalidateQueries({ queryKey: ["config"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const test = useMutation({
    mutationFn: () => testConfig(),
    onSuccess: (result) => setTestResult(result),
    onError: (error: Error) =>
      setTestResult({ ok: false, httpStatus: null, message: error.message }),
  });

  const update = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Configurações</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Parâmetros de conexão com o módulo de compras da Concinco. O token fica guardado no
          servidor da aplicação e nunca é exposto ao navegador.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando configurações…
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Conexão com a API</CardTitle>
              <CardDescription>
                O endpoint de destino é{" "}
                <code className="rounded bg-secondary px-1 py-0.5 text-xs">
                  POST [URLAPI]/PedidoComprasApi/api/v1/PedidoCompras/incluir-pedido-compra
                </code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="baseUrl">URL base da API</Label>
                <Input
                  id="baseUrl"
                  placeholder="https://api.suaempresa.com.br"
                  value={form.baseUrl}
                  onChange={(event) => update("baseUrl")(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Informe apenas a raiz. O caminho do endpoint é anexado automaticamente.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="authToken">Token / chave de autenticação</Label>
                <Input
                  id="authToken"
                  type="password"
                  autoComplete="off"
                  placeholder={data?.hasToken ? "•••••••• (token salvo)" : "Cole o token de acesso"}
                  value={form.authToken}
                  onChange={(event) => update("authToken")(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {data?.hasToken
                    ? "Um token já está salvo. Deixe em branco para mantê-lo."
                    : "Enviado no cabeçalho Authorization (Bearer) e x-api-key."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="empresa">Código da empresa</Label>
                  <Input
                    id="empresa"
                    value={form.empresa}
                    onChange={(event) => update("empresa")(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filial">Código da filial</Label>
                  <Input
                    id="filial"
                    value={form.filial}
                    onChange={(event) => update("filial")(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condicaoPagamento">Condição de pagamento</Label>
                  <Input
                    id="condicaoPagamento"
                    value={form.condicaoPagamento}
                    onChange={(event) => update("condicaoPagamento")(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoPedido">Tipo de pedido</Label>
                  <Input
                    id="tipoPedido"
                    value={form.tipoPedido}
                    onChange={(event) => update("tipoPedido")(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-md border border-border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Consulta do cadastro de produtos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Usada para localizar o código interno da empresa pelo código de barras (EAN) ou
                    pela referência do item faturado.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="produtoPath">Rota de consulta de produtos</Label>
                  <Input
                    id="produtoPath"
                    placeholder="/ProdutoApi/api/v1/Produto/consultar"
                    value={form.produtoPath}
                    onChange={(event) => update("produtoPath")(event.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="produtoParamEan">Parâmetro do código de barras</Label>
                    <Input
                      id="produtoParamEan"
                      value={form.produtoParamEan}
                      onChange={(event) => update("produtoParamEan")(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produtoParamReferencia">Parâmetro da referência</Label>
                    <Input
                      id="produtoParamReferencia"
                      value={form.produtoParamReferencia}
                      onChange={(event) => update("produtoParamReferencia")(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observação padrão do pedido</Label>
                <Textarea
                  id="observacao"
                  rows={3}
                  value={form.observacao}
                  onChange={(event) => update("observacao")(event.target.value)}
                  placeholder="Deixe em branco para gerar automaticamente com o número da nota."
                />
              </div>


              <div className="flex flex-wrap gap-2">
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar configurações
                </Button>
                <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending}>
                  {test.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wifi className="mr-2 h-4 w-4" />
                  )}
                  Testar conexão
                </Button>
              </div>

              {testResult && (
                <Alert variant={testResult.ok ? "default" : "destructive"}>
                  {testResult.ok ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {testResult.ok ? "Conexão respondida" : "Não foi possível conectar"}
                  </AlertTitle>
                  <AlertDescription className="break-words">{testResult.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Como os dados são usados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Os campos de empresa, filial, condição de pagamento e tipo de pedido entram no
                cabeçalho do pedido enviado à Concinco.
              </p>
              <p>
                Os dados do fornecedor, valores e itens vêm diretamente do XML da nota fiscal
                importada.
              </p>
              <p>
                O teste de conexão faz uma chamada leve ao endpoint para verificar se a URL está
                acessível — nenhum pedido é criado.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
