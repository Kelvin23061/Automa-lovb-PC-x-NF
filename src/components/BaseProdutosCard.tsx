import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Database, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { importarBaseProdutos, infoBaseProdutos } from "@/lib/concinco.functions";

const LOTE = 4000;

export function BaseProdutosCard({ compact = false }: { compact?: boolean }) {
  const fetchInfo = useServerFn(infoBaseProdutos);
  const enviarLote = useServerFn(importarBaseProdutos);
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const modo = useRef<"adicionar" | "substituir">("adicionar");

  const { data } = useQuery({ queryKey: ["base-produtos"], queryFn: () => fetchInfo() });

  async function importar(file: File) {
    try {
      setProgresso(0);
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet =
        wb.SheetNames.map((n) => wb.Sheets[n]).find((s) => {
          if (!s) return false;
          const rows = XLSX.utils.sheet_to_json<string[]>(s, { header: 1, range: 0 });
          return rows[0]?.map((c) => String(c).toUpperCase()).includes("CODACESSO");
        }) ?? null;
      if (!sheet) throw new Error("Nenhuma aba com as colunas SEQPRODUTO e CODACESSO foi encontrada.");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const s = (v: unknown) => String(v ?? "").trim();
      const linhas = rows
        .map((r) => ({
          seqProduto: s(r["SEQPRODUTO"]),
          fornecedor: s(r["FORNECEDOR"]).slice(0, 300),
          codAcesso: s(r["CODACESSO"]),
          descricao: s(r["DESCCOMPLETA"]).slice(0, 500),
          embalagem: s(r["EMBALAGEM"]).slice(0, 100),
          tipoCodigo: s(r["TIPCODIGO"]).slice(0, 60),
        }))
        .filter((l) => l.seqProduto && l.codAcesso);
      if (!linhas.length) throw new Error("A planilha não contém produtos válidos.");
      let novos = 0;
      let atualizados = 0;
      for (let i = 0; i < linhas.length; i += LOTE) {
        const r = await enviarLote({
          data: { substituir: modo.current === "substituir" && i === 0, arquivo: file.name, linhas: linhas.slice(i, i + LOTE) },
        });
        novos += r.novos;
        atualizados += r.atualizados;
        setProgresso(Math.round(((i + LOTE) / linhas.length) * 100));
      }
      toast.success(
        modo.current === "substituir"
          ? `Base substituída com ${novos.toLocaleString("pt-BR")} códigos.`
          : `Base atualizada: ${novos.toLocaleString("pt-BR")} novos códigos, ${atualizados.toLocaleString("pt-BR")} atualizados.`,
      );
      qc.invalidateQueries({ queryKey: ["base-produtos"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar a planilha.");
    } finally {
      setProgresso(null);
      if (input.current) input.current.value = "";
    }
  }

  const info = (
    <>
      <div>
        <p className="text-muted-foreground">Códigos na base</p>
        <p className="text-xl font-semibold">{data ? data.total.toLocaleString("pt-BR") : "…"}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Última atualização</p>
        <p className="font-medium">
          {data?.atualizadoEm
            ? `${new Date(data.atualizadoEm).toLocaleString("pt-BR")}${data.arquivo ? ` · ${data.arquivo}` : ""}`
            : data?.total
              ? "Carga inicial"
              : "—"}
        </p>
      </div>
    </>
  );

  const botoes = (
    <>
      <Button
        disabled={progresso !== null}
        onClick={() => {
          modo.current = "adicionar";
          input.current?.click();
        }}
      >
        {progresso !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Importar planilha e atualizar base
      </Button>
      {!compact && (
        <Button
          variant="outline"
          disabled={progresso !== null}
          onClick={() => {
            if (!confirm("Isso apaga toda a base atual e a substitui pela planilha enviada. Continuar?")) return;
            modo.current = "substituir";
            input.current?.click();
          }}
        >
          Substituir base completa
        </Button>
      )}
      <input
        ref={input}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])}
      />
    </>
  );

  if (compact) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 py-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Database className="h-4 w-4 text-primary" /> Base de produtos
          </div>
          {info}
          <div className="ml-auto">{botoes}</div>
          {progresso !== null && <Progress className="w-full" value={Math.min(progresso, 100)} />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4" /> Base de produtos (código de barras → código interno)
        </CardTitle>
        <CardDescription>
          Os itens da nota são conciliados pelo código de barras com esta base. Envie a planilha
          com as colunas SEQPRODUTO, FORNECEDOR, CODACESSO, DESCCOMPLETA, EMBALAGEM e TIPCODIGO:
          os códigos novos entram e os existentes são atualizados automaticamente, sem apagar nada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          {info}
          <div className="ml-auto flex flex-wrap gap-2">{botoes}</div>
        </div>
        {progresso !== null && <Progress value={Math.min(progresso, 100)} />}
      </CardContent>
    </Card>
  );
}
