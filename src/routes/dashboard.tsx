import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
import type { HistoryRow } from "@/lib/concinco-schemas";
import { listarHistorico } from "@/lib/concinco.functions";
import { formatCnpj, formatMoney } from "@/lib/nfe";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard de pedidos de compras | Automação Fiscal" },
      {
        name: "description",
        content:
          "Indicadores de pedidos de compras gerados por dia e por mês, valores por pedido e ranking dos fornecedores mais recorrentes.",
      },
      { property: "og:title", content: "Dashboard de pedidos de compras | Automação Fiscal" },
      {
        property: "og:description",
        content:
          "Acompanhe volume diário e mensal de pedidos, valores enviados e o ranking de fornecedores.",
      },
    ],
  }),
  component: DashboardPage,
});

const PERIODS = [
  { key: "30d", label: "30 dias", days: 30 },
  { key: "90d", label: "90 dias", days: 90 },
  { key: "12m", label: "12 meses", days: 365 },
  { key: "all", label: "Tudo", days: null },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function dayKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function monthKey(value: string) {
  return new Date(value).toISOString().slice(0, 7);
}

function formatDayLabel(key: string) {
  const [, m = "", d = ""] = key.split("-");
  return `${d}/${m}`;
}

function formatMonthLabel(key: string) {
  const [y = "", m = ""] = key.split("-");
  return `${m}/${y.slice(2)}`;
}

function compactMoney(value: number) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return String(Math.round(value));
}

function DashboardPage() {
  const fetchHistory = useServerFn(listarHistorico);
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["history"],
    queryFn: () => fetchHistory(),
  });

  const rows: HistoryRow[] = data ?? [];

  const stats = useMemo(() => {
    const days = PERIODS.find((p) => p.key === period)?.days ?? null;
    const cutoff = days ? Date.now() - days * 86_400_000 : null;
    const inPeriod = rows.filter((row) => {
      const time = new Date(row.created_at).getTime();
      return !cutoff || (Number.isFinite(time) && time >= cutoff);
    });

    const success = inPeriod.filter((row) => row.status === "sucesso");
    const failures = inPeriod.length - success.length;

    const todayKey = new Date().toISOString().slice(0, 10);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const hoje = success.filter((row) => dayKey(row.created_at) === todayKey).length;
    const mes = success.filter((row) => monthKey(row.created_at) === currentMonth).length;
    const valorTotal = success.reduce((sum, row) => sum + Number(row.valor_total || 0), 0);

    const byDayMap = new Map<string, number>();
    for (const row of success) {
      const key = dayKey(row.created_at);
      byDayMap.set(key, (byDayMap.get(key) ?? 0) + 1);
    }
    const spanDays = Math.min(days ?? 30, 90);
    const byDay: { label: string; pedidos: number }[] = [];
    for (let i = spanDays - 1; i >= 0; i--) {
      const key = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      byDay.push({ label: formatDayLabel(key), pedidos: byDayMap.get(key) ?? 0 });
    }

    const byMonthMap = new Map<string, number>();
    for (const row of success) {
      const key = monthKey(row.created_at);
      byMonthMap.set(key, (byMonthMap.get(key) ?? 0) + 1);
    }
    const byMonth: { label: string; pedidos: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = d.toISOString().slice(0, 7);
      byMonth.push({ label: formatMonthLabel(key), pedidos: byMonthMap.get(key) ?? 0 });
    }

    const supplierMap = new Map<
      string,
      { nome: string; cnpj: string; pedidos: number; valor: number }
    >();
    for (const row of success) {
      const key = row.emitente_cnpj || row.emitente_nome || "—";
      const entry = supplierMap.get(key) ?? {
        nome: row.emitente_nome || "Fornecedor sem nome",
        cnpj: row.emitente_cnpj,
        pedidos: 0,
        valor: 0,
      };
      entry.pedidos += 1;
      entry.valor += Number(row.valor_total || 0);
      supplierMap.set(key, entry);
    }
    const ranking = [...supplierMap.values()].sort(
      (a, b) => b.pedidos - a.pedidos || b.valor - a.valor,
    );

    const porPedido = success
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 15)
      .reverse()
      .map((row) => ({
        label: row.numero_pedido ? `#${row.numero_pedido}` : `NF ${row.numero_nota}`,
        valor: Number(row.valor_total || 0),
      }));

    return {
      total: success.length,
      failures,
      hoje,
      mes,
      valorTotal,
      byDay,
      byMonth,
      ranking,
      porPedido,
    };
  }, [rows, period]);

  const topSuppliers = stats.ranking.slice(0, 6).map((item, index) => ({
    label: item.nome.length > 18 ? `${item.nome.slice(0, 18)}…` : item.nome,
    pedidos: item.pedidos,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Dashboard</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Volume de pedidos de compras gerados na Concinco, valores enviados e desempenho por
            fornecedor.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card p-1">
            {PERIODS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPeriod(item.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === item.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando indicadores...
        </div>
      ) : stats.total === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" /> Nenhum pedido no período
            </CardTitle>
            <CardDescription>
              Importe um XML de NF-e e gere um pedido de compras para começar a acompanhar os
              indicadores aqui.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              icon={<CalendarDays className="h-4 w-4" />}
              label="Pedidos hoje"
              value={String(stats.hoje)}
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Pedidos no mês"
              value={String(stats.mes)}
            />
            <MetricCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Pedidos no período"
              value={String(stats.total)}
            />
            <MetricCard
              icon={<Users className="h-4 w-4" />}
              label="Fornecedores"
              value={String(stats.ranking.length)}
            />
            <MetricCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Valor total enviado"
              value={formatMoney(stats.valorTotal)}
              hint={stats.failures > 0 ? `${stats.failures} envio(s) com erro` : undefined}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Pedidos por dia" description="Quantidade de pedidos gerados por dia">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={stats.byDay} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="fillDia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    interval="preserveStartEnd"
                    minTickGap={16}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip content={<ChartTooltip suffix=" pedido(s)" />} />
                  <Area
                    type="monotone"
                    dataKey="pedidos"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#fillDia)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Pedidos por mês" description="Últimos 12 meses">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.byMonth} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip content={<ChartTooltip suffix=" pedido(s)" />} />
                  <Bar dataKey="pedidos" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Pedidos por fornecedor"
              description="Principais fornecedores no período"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={topSuppliers}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={130}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip content={<ChartTooltip suffix=" pedido(s)" />} />
                  <Bar dataKey="pedidos" radius={[0, 6, 6, 0]}>
                    {topSuppliers.map((item) => (
                      <Cell key={item.label} fill={item.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Valores por pedido" description="Últimos 15 pedidos gerados">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.porPedido} margin={{ left: -10, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={54}
                  />
                  <YAxis
                    tickFormatter={compactMoney}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip content={<ChartTooltip money />} />
                  <Bar dataKey="valor" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking de fornecedores</CardTitle>
              <CardDescription>
                Ordenado pela quantidade de pedidos de compras gerados no período.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Valor total</TableHead>
                    <TableHead className="text-right">Ticket médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.ranking.map((item, index) => (
                    <TableRow key={`${item.cnpj}-${item.nome}`}>
                      <TableCell>
                        {index < 3 ? (
                          <Badge variant={index === 0 ? "default" : "secondary"}>{index + 1}º</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">{index + 1}º</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{item.nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.cnpj ? formatCnpj(item.cnpj) : "—"}
                      </TableCell>
                      <TableCell className="text-right">{item.pedidos}</TableCell>
                      <TableCell className="text-right">{formatMoney(item.valor)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatMoney(item.valor / item.pedidos)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string | undefined;
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span className="text-primary">{icon}</span>
          {label}
        </div>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {hint ? <p className="text-xs text-destructive">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  money,
  suffix,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string;
  money?: boolean;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  const raw = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{label}</p>
      <p className="text-muted-foreground">
        {money ? formatMoney(raw) : `${raw}${suffix ?? ""}`}
      </p>
    </div>
  );
}
