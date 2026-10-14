import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BaseProdutosCard } from "@/components/BaseProdutosCard";
import { NfePreview } from "@/components/NfePreview";
import { consultarCadastroItens, gerarPedidoCompra } from "@/lib/concinco.functions";
import type { EnvioResultado, ItemVinculo } from "@/lib/concinco-schemas";
import { NfeParseError, parseNfeXml, type NfeData } from "@/lib/nfe";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Importar XML de NF-e | Automação de Pedido de Compras" },
      {
        name: "description",
        content:
          "Leia XMLs de notas fiscais eletrônicas, confira os dados extraídos e gere o pedido de compras na Concinco automaticamente.",
      },
      { property: "og:title", content: "Importar XML de NF-e | Automação de Pedido de Compras" },
      {
        property: "og:description",
        content:
          "Upload de XML de NF-e com pré-visualização dos itens e envio automático do pedido de compras para a Concinco.",
      },
    ],
  }),
  component: ImportarPage,
});

interface Entry {
  key: string;
  nfe: NfeData;
  loading: boolean;
  checking: boolean;
  vinculos: Record<number, ItemVinculo> | null;
  vinculoErro: string | null;
  result: EnvioResultado | null;
}

function ImportarPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const enviar = useServerFn(gerarPedidoCompra);
  const consultar = useServerFn(consultarCadastroItens);

  const patch = (key: string, changes: Partial<Entry>) =>
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...changes } : e)));

  const verificarVinculos = useCallback(
    async (entry: Entry, silencioso = false) => {
      patch(entry.key, { checking: true });
      try {
        const res = await consultar({ data: { itens: entry.nfe.itens } });
        const mapa: Record<number, ItemVinculo> = {};
        for (const v of res.vinculos) mapa[v.sequencia] = v;
        patch(entry.key, {
          checking: false,
          vinculos: mapa,
          vinculoErro: res.ok ? null : res.mensagem,
        });
        if (!silencioso) {
          const pendentes = res.vinculos.filter((v) => !v.codigoInterno).length;
          if (!res.ok) {
            toast.error(res.mensagem ?? "Não foi possível consultar o cadastro dos itens.");
          } else if (pendentes === 0) {
            toast.success("Todos os itens estão cadastrados. Pronto para gerar o pedido.");
          } else {
            toast.warning(`${pendentes} item(ns) ainda sem cadastro na empresa.`);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao consultar itens.";
        patch(entry.key, { checking: false, vinculoErro: message });
        if (!silencioso) toast.error(message);
      }
    },
    [consultar],
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const errors: string[] = [];
      const parsed: Entry[] = [];

      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith(".xml")) {
          errors.push(`${file.name}: apenas arquivos .xml são aceitos.`);
          continue;
        }
        try {
          const nfe = parseNfeXml(await file.text(), file.name);
          parsed.push({
            key: `${file.name}-${nfe.chave || nfe.numero}-${Date.now()}-${parsed.length}`,
            nfe,
            loading: false,
            checking: false,
            vinculos: null,
            vinculoErro: null,
            result: null,
          });
        } catch (error) {
          errors.push(
            `${file.name}: ${error instanceof NfeParseError ? error.message : "não foi possível ler o XML."}`,
          );
        }
      }

      setParseErrors(errors);
      if (parsed.length) {
        setEntries((prev) => [...parsed, ...prev]);
        toast.success(
          parsed.length === 1 ? "Nota fiscal lida com sucesso." : `${parsed.length} notas lidas.`,
        );
        for (const entry of parsed) void verificarVinculos(entry, true);
      }
    },
    [verificarVinculos],
  );

  const removeEntry = (key: string) => setEntries((prev) => prev.filter((e) => e.key !== key));

  const send = async (entry: Entry) => {
    patch(entry.key, { loading: true, result: null });
    const codigosInternos: Record<string, string | null> = {};
    for (const item of entry.nfe.itens) {
      codigosInternos[String(item.sequencia)] =
        entry.vinculos?.[item.sequencia]?.codigoInterno ?? null;
    }
    try {
      const result = await enviar({ data: { nfe: entry.nfe, codigosInternos } });
      patch(entry.key, { loading: false, result });
      if (result.ok) {
        toast.success(
          result.numeroPedido
            ? `Pedido ${result.numeroPedido} gerado na Concinco.`
            : "Pedido enviado com sucesso.",
        );
      } else {
        toast.error(result.errorMessage ?? "Falha ao gerar o pedido de compras.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado no envio.";
      patch(entry.key, {
        loading: false,
        result: {
          ok: false,
          numeroPedido: null,
          httpStatus: null,
          errorMessage: message,
          payload: null,
          response: null,
          historyId: null,
        },
      });
      toast.error(message);
    }
  };


  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Importação de XML de NF-e
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Arraste os arquivos XML das notas faturadas, confira os dados extraídos e gere o pedido de
          compras na Concinco com um clique. A leitura acontece no seu navegador; o envio à API é
          feito pelo servidor da aplicação.
        </p>
      </div>

      <Card
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
        className={dragging ? "border-primary bg-accent/40" : ""}
      >
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
            <UploadCloud className="h-7 w-7" />
          </span>
          <div>
            <p className="text-base font-medium text-foreground">
              Arraste e solte os XMLs aqui
            </p>
            <p className="text-sm text-muted-foreground">
              Aceita múltiplos arquivos de NF-e (.xml), incluindo XMLs com protocolo de autorização.
            </p>
          </div>
          <Button onClick={() => inputRef.current?.click()}>
            <FileUp className="mr-2 h-4 w-4" />
            Selecionar arquivos
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            multiple
            className="hidden"
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </CardContent>
      </Card>

      <BaseProdutosCard compact />

      {parseErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Alguns arquivos não foram lidos</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc space-y-1">
              {parseErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma nota carregada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {entries.map((entry) => {
            const pendentes = entry.vinculos
              ? entry.nfe.itens.filter((item) => !entry.vinculos?.[item.sequencia]?.codigoInterno)
              : [];
            const pronto = Boolean(entry.vinculos) && pendentes.length === 0;
            return (
            <section key={entry.key} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">
                  NF-e {entry.nfe.numero}/{entry.nfe.serie}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {entry.nfe.emitenteNome}
                  </span>
                </h2>
                <div className="flex items-center gap-2">
                  {pronto && !entry.result && (
                    <Badge className="bg-success text-success-foreground">
                      Itens cadastrados · pronto para envio
                    </Badge>
                  )}
                  {entry.result?.ok && <Badge className="bg-success text-success-foreground">Enviada</Badge>}
                  {entry.result && !entry.result.ok && <Badge variant="destructive">Erro</Badge>}
                  <Button variant="ghost" size="sm" onClick={() => removeEntry(entry.key)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void verificarVinculos(entry)}
                    disabled={entry.checking}
                  >
                    {entry.checking ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Atualizar cadastro
                  </Button>
                  <Button onClick={() => void send(entry)} disabled={entry.loading || !pronto}>
                    {entry.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando…
                      </>
                    ) : (
                      "Gerar pedido de compras"
                    )}
                  </Button>
                </div>
              </div>

              {entry.vinculoErro && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Não foi possível consultar o cadastro dos itens</AlertTitle>
                  <AlertDescription className="break-words">{entry.vinculoErro}</AlertDescription>
                </Alert>
              )}

              {entry.vinculos && pendentes.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {pendentes.length} item(ns) sem cadastro na empresa
                  </AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">
                      Cadastre os produtos abaixo na Concinco e clique em “Atualizar cadastro”.
                    </p>
                    <ul className="list-inside list-disc space-y-1">
                      {pendentes.map((item) => (
                        <li key={item.sequencia}>
                          Item {item.sequencia} · {item.descricao} — EAN{" "}
                          {item.ean || "não informado"} · Referência {item.referencia || "-"}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <NfePreview nfe={entry.nfe} vinculos={entry.vinculos ?? undefined} />

              {entry.result && <ResultPanel result={entry.result} />}
            </section>
            );
          })}

        </div>
      )}
    </div>
  );
}

function ResultPanel({ result }: { result: EnvioResultado }) {
  return (
    <Card className={result.ok ? "border-success/50" : "border-destructive/50"}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {result.ok ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
          {result.ok ? "Pedido de compras gerado" : "Falha ao gerar o pedido"}
        </CardTitle>
        <CardDescription>
          {result.httpStatus ? `Resposta HTTP ${result.httpStatus}` : "Sem resposta do servidor"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.ok ? (
          <p className="text-sm text-foreground">
            Número do pedido na Concinco:{" "}
            <span className="font-mono text-base font-semibold">
              {result.numeroPedido ?? "não informado pela API"}
            </span>
          </p>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Mensagem do servidor</AlertTitle>
            <AlertDescription className="break-words">{result.errorMessage}</AlertDescription>
          </Alert>
        )}
        <Separator />
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-foreground">
            Ver JSON enviado e resposta
          </summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <pre className="max-h-72 overflow-auto rounded-md bg-secondary p-3 text-xs">
              {JSON.stringify(result.payload, null, 2)}
            </pre>
            <pre className="max-h-72 overflow-auto rounded-md bg-secondary p-3 text-xs">
              {JSON.stringify(result.response, null, 2)}
            </pre>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
