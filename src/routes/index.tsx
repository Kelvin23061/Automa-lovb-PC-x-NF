import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { NfePreview } from "@/components/NfePreview";
import { gerarPedidoCompra } from "@/lib/concinco.functions";
import type { EnvioResultado } from "@/lib/concinco-schemas";
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
  result: EnvioResultado | null;
}

function ImportarPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const enviar = useServerFn(gerarPedidoCompra);

  const handleFiles = useCallback(async (files: FileList | null) => {
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
    }
  }, []);

  const removeEntry = (key: string) => setEntries((prev) => prev.filter((e) => e.key !== key));

  const send = async (entry: Entry) => {
    setEntries((prev) =>
      prev.map((e) => (e.key === entry.key ? { ...e, loading: true, result: null } : e)),
    );
    try {
      const result = await enviar({ data: entry.nfe });
      setEntries((prev) =>
        prev.map((e) => (e.key === entry.key ? { ...e, loading: false, result } : e)),
      );
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
      setEntries((prev) =>
        prev.map((e) =>
          e.key === entry.key
            ? {
                ...e,
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
              }
            : e,
        ),
      );
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
          {entries.map((entry) => (
            <section key={entry.key} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">
                  NF-e {entry.nfe.numero}/{entry.nfe.serie}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {entry.nfe.emitenteNome}
                  </span>
                </h2>
                <div className="flex items-center gap-2">
                  {entry.result?.ok && <Badge className="bg-success text-success-foreground">Enviada</Badge>}
                  {entry.result && !entry.result.ok && <Badge variant="destructive">Erro</Badge>}
                  <Button variant="ghost" size="sm" onClick={() => removeEntry(entry.key)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover
                  </Button>
                  <Button onClick={() => void send(entry)} disabled={entry.loading}>
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

              <NfePreview nfe={entry.nfe} />

              {entry.result && <ResultPanel result={entry.result} />}
            </section>
          ))}
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
