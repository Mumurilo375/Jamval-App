import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button, DateInput, ErrorBanner, Field, PageHeader, PageLoader, ToneBadge } from "../../components/ui";
import { formatCurrency, formatDate, formatDateTime } from "../../lib/format";
import { getAdminDashboard } from "./admin-api";
import { AdminEmptyBlock, AdminListRow, AdminMetricCard, AdminQueryErrorState, AdminSectionCard } from "./admin-ui";

const LOW_STOCK_THRESHOLD_LABEL = "5";

export function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [defaultPeriod] = useState(() => createDefaultPeriod());
  const dateFrom = searchParams.get("dateFrom") ?? defaultPeriod.dateFrom;
  const dateTo = searchParams.get("dateTo") ?? defaultPeriod.dateTo;
  const isMobile = useIsMobileDashboard();
  const [draftFilters, setDraftFilters] = useState({ dateFrom, dateTo });

  useEffect(() => {
    setDraftFilters({ dateFrom, dateTo });
  }, [dateFrom, dateTo]);

  const invalidPeriod =
    draftFilters.dateFrom.length > 0 &&
    draftFilters.dateTo.length > 0 &&
    new Date(draftFilters.dateFrom).getTime() > new Date(draftFilters.dateTo).getTime();
  const dashboardQuery = useQuery({
    queryKey: ["admin", "dashboard", dateFrom, dateTo],
    queryFn: () => getAdminDashboard({ dateFrom, dateTo })
  });

  if (dashboardQuery.isPending) {
    return <PageLoader label="Carregando visao geral..." />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <AdminQueryErrorState
        title="Nao foi possivel carregar a visao geral"
        error={dashboardQuery.error}
        onRetry={() => void dashboardQuery.refetch()}
      />
    );
  }

  const { headline, salesVsReceiptsSeries, visitsSeries, receivablesStatus, profitCoverage, stockAlerts } =
    dashboardQuery.data;
  const financeHasData = salesVsReceiptsSeries.some((entry) => entry.soldAmount > 0 || entry.receivedAmount > 0);
  const visitsHasData = visitsSeries.some((entry) => entry.completedVisits > 0);
  const portfolioTotal = receivablesStatus.pending.amount + receivablesStatus.partial.amount + receivablesStatus.paid.amount;
  const resultTotal =
    profitCoverage.confirmed.revenueAmount + profitCoverage.reference.revenueAmount + profitCoverage.missing.revenueAmount;
  const consignmentVisits = visitsSeries.reduce((sum, entry) => sum + entry.consignmentVisits, 0);
  const saleVisits = visitsSeries.reduce((sum, entry) => sum + entry.saleVisits, 0);
  const totalVisitsByType = consignmentVisits + saleVisits;

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-2">
      <PageHeader
        eyebrow="Administracao"
        title="Visao geral"
        subtitle="Leitura curta do financeiro, do ritmo comercial e dos alertas de estoque."
      />

      <section className="overflow-hidden rounded-2xl border border-[var(--jam-border)] bg-[var(--jam-panel)] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jam-subtle)]">Periodo</p>
        <h2 className="mt-1 text-sm font-semibold text-[var(--jam-ink)]">Escolha o recorte manual</h2>
        <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)]">
          Lendo de {formatDate(dateFrom)} ate {formatDate(dateTo)}.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Data inicial">
            <DateInput
              value={draftFilters.dateFrom}
              onValueChange={(value) => setDraftFilters((current) => ({ ...current, dateFrom: value }))}
            />
          </Field>
          <Field label="Data final">
            <DateInput
              value={draftFilters.dateTo}
              onValueChange={(value) => setDraftFilters((current) => ({ ...current, dateTo: value }))}
            />
          </Field>
        </div>

        {invalidPeriod ? <div className="mt-3"><ErrorBanner message="A data inicial nao pode ser maior que a data final." /></div> : null}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={invalidPeriod}
            onClick={() => setSearchParams(toSearchParams(draftFilters))}
          >
            Aplicar periodo
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => {
              setDraftFilters(defaultPeriod);
              setSearchParams(new URLSearchParams());
            }}
          >
            Limpar filtro
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Entrou no caixa"
          value={formatCurrency(headline.receivedAmount)}
          hint={headline.receivedAmount > 0 ? "Recebimentos lancados neste recorte." : "Sem entrada registrada neste recorte."}
          tone={headline.receivedAmount > 0 ? "success" : "neutral"}
        />
        <AdminMetricCard
          label="Em aberto na carteira"
          value={formatCurrency(headline.outstandingAmount)}
          hint={`${receivablesStatus.pending.count + receivablesStatus.partial.count} titulo(s) para acompanhar.`}
          tone={headline.outstandingAmount > 0 ? "warning" : "success"}
        />
        <AdminMetricCard
          label="Lucro ja apurado"
          value={headline.confirmedGrossProfitAmount === null ? "-" : formatCurrency(headline.confirmedGrossProfitAmount)}
          hint={headline.confirmedGrossProfitAmount === null ? "Ainda falta apurar parte do custo." : "Lucro ja fechado neste recorte."}
          tone={headline.confirmedGrossProfitAmount === null ? "warning" : "neutral"}
        />
        <AdminMetricCard
          label="Vendido no periodo"
          value={formatCurrency(headline.soldAmount)}
          hint={`${headline.completedVisits} visita(s) concluidas.`}
        />
      </div>

      <AdminSectionCard
        eyebrow="Financeiro"
        title="Vendido x recebido"
        description="Comparacao diaria do que foi vendido e do que entrou no caixa."
        action={<Link to="/financeiro"><Button variant="secondary" className="w-full sm:w-auto">Abrir receber</Button></Link>}
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.95fr)]">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--jam-border)] bg-white p-3 sm:p-4">
            {financeHasData ? (
              <>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <SummaryTile label="Vendido" value={formatCurrency(headline.soldAmount)} tone="primary" />
                  <SummaryTile label="Recebido" value={formatCurrency(headline.receivedAmount)} tone="success" />
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <LegendDot label="Vendido" color="#1d4ed8" />
                  <LegendDot label="Recebido" color="#0f766e" />
                </div>
                <ResponsiveContainer width="100%" height={isMobile ? 220 : 290}>
                  <AreaChart data={salesVsReceiptsSeries} margin={isMobile ? { top: 8, right: 4, left: 0, bottom: 0 } : { top: 8, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashboard-sold" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="dashboard-received" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#0f766e" stopOpacity={0.24} />
                        <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.16)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: isMobile ? 10 : 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      interval={isMobile ? "preserveStartEnd" : 0}
                      minTickGap={isMobile ? 30 : 16}
                      tickFormatter={(value: string) => formatShortAxisDate(value, isMobile)}
                    />
                    {!isMobile ? <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={72} tickFormatter={formatCompactCurrency} /> : null}
                    <Tooltip
                      formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value ?? 0)), name === "soldAmount" ? "Vendido" : "Recebido"]}
                      labelFormatter={(label: unknown) => formatDate(typeof label === "string" ? label : null)}
                    />
                    <Area type="monotone" dataKey="soldAmount" name="soldAmount" stroke="#1d4ed8" fill="url(#dashboard-sold)" strokeWidth={2.4} />
                    <Area type="monotone" dataKey="receivedAmount" name="receivedAmount" stroke="#0f766e" fill="url(#dashboard-received)" strokeWidth={2.4} />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            ) : (
              <AdminEmptyBlock title="Sem movimentacao financeira no periodo" message="Ainda nao ha vendas ou recebimentos suficientes para desenhar este comparativo." />
            )}
          </div>

          <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--jam-border)] bg-white p-3 sm:p-4">
            <div className="mb-3">
              <p className="text-[13px] font-semibold text-[var(--jam-ink)]">Carteira atual</p>
              <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)]">Quanto esta em aberto, parcial e quitado hoje.</p>
            </div>
            <div className="mb-4 h-3 overflow-hidden rounded-full bg-[var(--jam-panel-strong)]">
              <div className="flex h-full w-full">
                <div className="bg-[rgba(180,83,9,0.75)]" style={{ width: `${toPercent(receivablesStatus.pending.amount, portfolioTotal)}%` }} />
                <div className="bg-[rgba(29,78,216,0.72)]" style={{ width: `${toPercent(receivablesStatus.partial.amount, portfolioTotal)}%` }} />
                <div className="bg-[rgba(15,118,110,0.74)]" style={{ width: `${toPercent(receivablesStatus.paid.amount, portfolioTotal)}%` }} />
              </div>
            </div>
            <div className="space-y-2.5">
              <StatusRow label="Em aberto" badgeTone="warning" count={receivablesStatus.pending.count} amount={receivablesStatus.pending.amount} progress={toBarPercent(receivablesStatus.pending.amount, portfolioTotal)} />
              <StatusRow label="Parcial" badgeTone="neutral" count={receivablesStatus.partial.count} amount={receivablesStatus.partial.amount} progress={toBarPercent(receivablesStatus.partial.amount, portfolioTotal)} />
              <StatusRow label="Quitado" badgeTone="success" count={receivablesStatus.paid.count} amount={receivablesStatus.paid.amount} progress={toBarPercent(receivablesStatus.paid.amount, portfolioTotal)} />
            </div>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        eyebrow="Comercial"
        title="Ritmo de visitas"
        description="Volume diario de visitas concluidas e o mix entre consignacao e venda."
        action={<Link to="/admin/indicadores"><Button variant="secondary" className="w-full sm:w-auto">Abrir indicadores</Button></Link>}
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.95fr)]">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--jam-border)] bg-white p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <LegendDot label="Consignacao" color="#b45309" />
              <LegendDot label="Venda" color="#b42318" />
            </div>
            {visitsHasData ? (
              <ResponsiveContainer width="100%" height={isMobile ? 220 : 290}>
                <BarChart data={visitsSeries} margin={isMobile ? { top: 6, right: 4, left: 0, bottom: 0 } : { top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 11, fill: "#64748b" }} tickLine={false} axisLine={false} interval={isMobile ? "preserveStartEnd" : 0} minTickGap={isMobile ? 30 : 16} tickFormatter={(value: string) => formatShortAxisDate(value, isMobile)} />
                  {!isMobile ? <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} allowDecimals={false} /> : null}
                  <Tooltip formatter={(value: unknown, name: unknown) => [`${Number(value ?? 0)} visita(s)`, name === "consignmentVisits" ? "Consignacao" : "Venda"]} labelFormatter={(label: unknown) => formatDate(typeof label === "string" ? label : null)} />
                  <Bar dataKey="consignmentVisits" stackId="visits" fill="#b45309" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saleVisits" stackId="visits" fill="#b42318" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmptyBlock title="Sem visitas concluidas no periodo" message="Ainda nao ha volume suficiente para montar o grafico comercial deste recorte." />
            )}
          </div>

          <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--jam-border)] bg-white p-3 sm:p-4">
            <div className="mb-3">
              <p className="text-[13px] font-semibold text-[var(--jam-ink)]">Mix de tipos</p>
              <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)]">Como as visitas do periodo se dividiram.</p>
            </div>
            {totalVisitsByType > 0 ? (
              <div className="space-y-3">
                <SplitRow label="Consignacao" count={consignmentVisits} progress={toBarPercent(consignmentVisits, totalVisitsByType)} colorClassName="bg-[rgba(180,83,9,0.82)]" />
                <SplitRow label="Venda" count={saleVisits} progress={toBarPercent(saleVisits, totalVisitsByType)} colorClassName="bg-[rgba(180,35,24,0.78)]" />
                <div className="rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel-strong)] px-3 py-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--jam-subtle)]">Total de visitas</p>
                  <p className="mt-2 text-[1.2rem] font-semibold text-[var(--jam-ink)]">{totalVisitsByType}</p>
                </div>
              </div>
            ) : (
              <AdminEmptyBlock title="Sem mix para comparar" message="Quando houver visitas concluidas neste recorte, a divisao entre consignacao e venda aparece aqui." />
            )}
          </div>
        </div>
      </AdminSectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSectionCard
          eyebrow="Resultado"
          title="Situacao das vendas"
          description="O que ja esta apurado, o que ainda esta em revisao e o que segue sem custo."
          action={<Link to="/admin/lucro"><Button variant="secondary" className="w-full sm:w-auto">Abrir lucro</Button></Link>}
        >
          {resultTotal > 0 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--jam-border)] bg-white p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--jam-ink)]">Lucro ja apurado</p>
                    <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)]">
                      {headline.confirmedGrossProfitAmount === null ? "Ainda falta apurar parte do custo." : "Parte do periodo que ja tem custo real encontrado."}
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold text-[var(--jam-ink)]">{headline.confirmedGrossProfitAmount === null ? "-" : formatCurrency(headline.confirmedGrossProfitAmount)}</p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--jam-panel-strong)]">
                  <div className="flex h-full w-full">
                    <div className="bg-[rgba(15,118,110,0.8)]" style={{ width: `${toPercent(profitCoverage.confirmed.revenueAmount, resultTotal)}%` }} />
                    <div className="bg-[rgba(180,83,9,0.75)]" style={{ width: `${toPercent(profitCoverage.reference.revenueAmount, resultTotal)}%` }} />
                    <div className="bg-[rgba(180,35,24,0.72)]" style={{ width: `${toPercent(profitCoverage.missing.revenueAmount, resultTotal)}%` }} />
                  </div>
                </div>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-3">
                <ResultTile title="Ja apurado" note="Custo real ja encontrado" value={formatCurrency(profitCoverage.confirmed.revenueAmount)} itemCount={profitCoverage.confirmed.visitItemsCount} tone="success" />
                <ResultTile title="Em revisao" note="Ainda usando referencia" value={formatCurrency(profitCoverage.reference.revenueAmount)} itemCount={profitCoverage.reference.visitItemsCount} tone="warning" />
                <ResultTile title="Sem custo" note="Ainda sem base de custo" value={formatCurrency(profitCoverage.missing.revenueAmount)} itemCount={profitCoverage.missing.visitItemsCount} tone="danger" />
              </div>
            </div>
          ) : (
            <AdminEmptyBlock title="Sem leitura de resultado no periodo" message="Ainda nao ha vendas suficientes neste recorte para montar esta visao." />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Estoque"
          title="Alertas rapidos"
          description="Estoque fica em segundo plano, so como alerta operacional."
          action={<Link to="/stock"><Button variant="secondary" className="w-full sm:w-auto">Abrir estoque</Button></Link>}
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <AdminMetricCard label="Produtos sem saldo" value={String(stockAlerts.zeroStockProducts)} tone={stockAlerts.zeroStockProducts > 0 ? "warning" : "success"} />
            <AdminMetricCard label="Baixo saldo" value={String(stockAlerts.lowStockProducts)} hint={`Ate ${LOW_STOCK_THRESHOLD_LABEL} un.`} tone={stockAlerts.lowStockProducts > 0 ? "warning" : "neutral"} />
          </div>
          <div className="rounded-xl border border-[var(--jam-border)] bg-white px-3 py-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--jam-subtle)]">Ultimo lancamento</p>
            <p className="mt-2 text-sm font-semibold text-[var(--jam-ink)]">{stockAlerts.lastMovement ? stockAlerts.lastMovement.label : "Sem historico ainda"}</p>
            <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)]">
              {stockAlerts.lastMovement ? `${formatBalanceEffect(stockAlerts.lastMovement.balanceEffect)} · ${formatDateTime(stockAlerts.lastMovement.createdAt)}` : "Quando houver movimentacao no estoque central, ela aparece aqui."}
            </p>
          </div>
          {stockAlerts.topLowStock.length === 0 ? (
            <AdminEmptyBlock title="Sem alerta imediato" message="Nao ha produtos ativos com baixo saldo neste momento." />
          ) : (
            <div className="space-y-2">
              {stockAlerts.topLowStock.map((product) => (
                <AdminListRow
                  key={product.productId}
                  title={product.name}
                  subtitle={product.lastMovement ? `${product.sku} · ultimo movimento: ${product.lastMovement.label}` : `${product.sku} · sem historico recente`}
                  value={`${product.currentQuantity} un.`}
                />
              ))}
            </div>
          )}
        </AdminSectionCard>
      </div>
    </div>
  );
}

function createDefaultPeriod() {
  const today = new Date();
  return { dateFrom: toDateValue(addDays(today, -29)), dateTo: toDateValue(today) };
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toSearchParams(filters: { dateFrom: string; dateTo: string }) {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  return params;
}

function formatShortAxisDate(value: string, isMobile = false) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return isMobile ? day : `${day}/${month}`;
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function toPercent(value: number, total: number) {
  if (total <= 0 || value <= 0) return 0;
  return Math.min((value / total) * 100, 100);
}

function toBarPercent(value: number, total: number) {
  const share = toPercent(value, total);
  return share <= 0 ? 0 : Math.max(share, 8);
}

function formatBalanceEffect(effect: "IN" | "OUT" | "NEUTRAL") {
  if (effect === "IN") return "Entrada";
  if (effect === "OUT") return "Saida";
  return "Neutro";
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel-strong)] px-2.5 py-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[12px] font-medium text-[var(--jam-subtle)]">{label}</span>
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone: "primary" | "success" }) {
  return (
    <div className={tone === "success" ? "rounded-xl border border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.06)] px-3 py-2.5" : "rounded-xl border border-[rgba(29,78,216,0.14)] bg-[rgba(29,78,216,0.06)] px-3 py-2.5"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--jam-subtle)]">{label}</p>
      <p className="mt-1 text-[13px] font-semibold text-[var(--jam-ink)]">{value}</p>
    </div>
  );
}

function ResultTile({ title, note, value, itemCount, tone }: { title: string; note: string; value: string; itemCount: number; tone: "success" | "warning" | "danger" }) {
  return (
    <div className="rounded-xl border border-[var(--jam-border)] bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-[var(--jam-ink)]">{title}</p>
            <ToneBadge label={title} tone={tone} />
          </div>
          <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)]">{note}</p>
        </div>
        <p className="shrink-0 text-[13px] font-semibold text-[var(--jam-ink)]">{value}</p>
      </div>
      <p className="mt-3 text-[12px] text-[var(--jam-subtle)]">{itemCount} item(ns) no periodo.</p>
    </div>
  );
}

function StatusRow({ label, badgeTone, count, amount, progress }: { label: string; badgeTone: "neutral" | "warning" | "success"; count: number; amount: number; progress: number }) {
  return (
    <div className="rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel-strong)] px-3 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-[var(--jam-ink)]">{label}</p>
            <ToneBadge label={badgeTone === "warning" ? "Atencao" : badgeTone === "success" ? "Ok" : "Acompanhar"} tone={badgeTone} />
          </div>
          <p className="mt-1 text-[12px] text-[var(--jam-subtle)]">{count} titulo(s)</p>
        </div>
        <p className="text-left text-[13px] font-semibold text-[var(--jam-ink)] sm:text-right">{formatCurrency(amount)}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className={badgeTone === "warning" ? "h-full rounded-full bg-[rgba(180,83,9,0.72)]" : badgeTone === "success" ? "h-full rounded-full bg-[rgba(15,118,110,0.72)]" : "h-full rounded-full bg-[rgba(29,78,216,0.7)]"} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function SplitRow({ label, count, progress, colorClassName }: { label: string; count: number; progress: number; colorClassName: string }) {
  return (
    <div className="rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel-strong)] px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-[var(--jam-ink)]">{label}</p>
        <p className="text-[13px] font-semibold text-[var(--jam-ink)]">{count} visita(s)</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className={`h-full rounded-full ${colorClassName}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function useIsMobileDashboard() {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 640 : false));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 639px)");
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
