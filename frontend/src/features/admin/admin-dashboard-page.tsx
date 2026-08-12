import { useEffect, useState, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button, DateInput, ErrorBanner, Field, PageHeader, PageLoader, ToneBadge } from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { getAdminDashboard } from "./admin-api";
import { AdminEmptyBlock, AdminQueryErrorState } from "./admin-ui";

type DashboardFilters = {
  dateFrom: string;
  dateTo: string;
};

export function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [defaultPeriod] = useState(createDefaultPeriod);
  const dateFrom = searchParams.get("dateFrom") ?? defaultPeriod.dateFrom;
  const dateTo = searchParams.get("dateTo") ?? defaultPeriod.dateTo;
  const periodKey = `${dateFrom}|${dateTo}`;
  const isMobile = useIsMobileDashboard();
  const [draftFilterState, setDraftFilterState] = useState(() => ({
    periodKey,
    filters: { dateFrom, dateTo }
  }));
  const draftFilters = draftFilterState.periodKey === periodKey ? draftFilterState.filters : { dateFrom, dateTo };
  const setDraftFilters = (nextValue: SetStateAction<DashboardFilters>) => {
    setDraftFilterState((current) => {
      const currentFilters = current.periodKey === periodKey ? current.filters : { dateFrom, dateTo };
      const nextFilters = typeof nextValue === "function" ? nextValue(currentFilters) : nextValue;
      return { periodKey, filters: nextFilters };
    });
  };

  const invalidPeriod =
    draftFilters.dateFrom.length > 0 &&
    draftFilters.dateTo.length > 0 &&
    new Date(draftFilters.dateFrom).getTime() > new Date(draftFilters.dateTo).getTime();
  const dashboardQuery = useQuery({
    queryKey: ["admin", "dashboard", dateFrom, dateTo],
    queryFn: () => getAdminDashboard({ dateFrom, dateTo })
  });

  if (dashboardQuery.isPending) return <PageLoader label="Carregando resumo financeiro..." />;

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <AdminQueryErrorState title="Não foi possível carregar o resumo financeiro" error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} />;
  }

  const { headline, salesVsReceiptsSeries, receivablesStatus, profitCoverage, stockAlerts } = dashboardQuery.data;
  const financeHasData = salesVsReceiptsSeries.some((entry) => entry.soldAmount > 0 || entry.receivedAmount > 0);
  const openTitles = receivablesStatus.pending.count + receivablesStatus.partial.count;
  const reviewedRevenue = profitCoverage.reference.revenueAmount + profitCoverage.missing.revenueAmount;
  const reviewedItems = profitCoverage.reference.visitItemsCount + profitCoverage.missing.visitItemsCount;
  const resultTotal = profitCoverage.confirmed.revenueAmount + reviewedRevenue;
  const stockAlertCount = stockAlerts.zeroStockProducts + stockAlerts.lowStockProducts;

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-2">
      <PageHeader title="Resumo financeiro" subtitle={`${formatDate(dateFrom)} a ${formatDate(dateTo)}`} />

      <details className="rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel)] px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[var(--jam-ink)] [&::-webkit-details-marker]:hidden">
          <span>Período</span>
          <span className="text-[12px] font-medium text-[var(--jam-accent)]">Alterar</span>
        </summary>
        <div className="mt-3 border-t border-[var(--jam-border)] pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Data inicial">
              <DateInput value={draftFilters.dateFrom} onValueChange={(value) => setDraftFilters((current) => ({ ...current, dateFrom: value }))} />
            </Field>
            <Field label="Data final">
              <DateInput value={draftFilters.dateTo} onValueChange={(value) => setDraftFilters((current) => ({ ...current, dateTo: value }))} />
            </Field>
          </div>
          {invalidPeriod ? <div className="mt-3"><ErrorBanner message="A data inicial não pode ser maior que a data final." /></div> : null}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="w-full sm:w-auto" disabled={invalidPeriod} onClick={() => setSearchParams(toSearchParams(draftFilters))}>Aplicar período</Button>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => { setDraftFilters(defaultPeriod); setSearchParams(new URLSearchParams()); }}>Usar últimos 30 dias</Button>
          </div>
        </div>
      </details>

      <section className="rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <dl className="grid divide-y divide-[var(--jam-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <SummaryMetric label="Entrou no caixa" value={formatCurrency(headline.receivedAmount)} note="Recebimentos lançados" tone={headline.receivedAmount > 0 ? "success" : "neutral"} />
          <SummaryMetric label="Em aberto" value={formatCurrency(headline.outstandingAmount)} note={`${openTitles} título(s) para acompanhar`} tone={headline.outstandingAmount > 0 ? "warning" : "success"} />
          <SummaryMetric label="Lucro apurado" value={headline.confirmedGrossProfitAmount === null ? "—" : formatCurrency(headline.confirmedGrossProfitAmount)} note={headline.confirmedGrossProfitAmount === null ? "Custo ainda incompleto" : "Com custo real encontrado"} tone={headline.confirmedGrossProfitAmount === null ? "warning" : "neutral"} />
        </dl>
      </section>

      <section className="rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel)] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--jam-ink)] sm:text-base">Próximas ações</h2>
          <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)] sm:text-[13px]">Os pontos que merecem atenção antes da próxima visita.</p>
        </div>
        <div className="mt-3 divide-y divide-[var(--jam-border)]">
          <DashboardActionRow
            title={openTitles > 0 ? "Acompanhar recebimentos" : "Carteira em dia"}
            description={openTitles > 0 ? `${openTitles} título(s) em aberto ou parcial · ${formatCurrency(headline.outstandingAmount)}` : "Não há títulos em aberto neste período."}
            actionLabel="Ver títulos"
            to="/financeiro"
            tone={openTitles > 0 ? "warning" : "success"}
          />
          <DashboardActionRow
            title={stockAlertCount > 0 ? "Revisar estoque" : "Estoque sem alertas"}
            description={stockAlertCount > 0 ? `${stockAlerts.zeroStockProducts} sem saldo e ${stockAlerts.lowStockProducts} com saldo baixo.` : "Não há produto ativo em nível crítico."}
            actionLabel="Abrir estoque"
            to="/stock"
            tone={stockAlertCount > 0 ? "warning" : "success"}
          />
          <DashboardActionRow
            title={reviewedRevenue > 0 ? "Completar custos do lucro" : "Custos do lucro conferidos"}
            description={reviewedRevenue > 0 ? `${formatCurrency(reviewedRevenue)} em vendas ainda precisa de revisão (${reviewedItems} item(ns)).` : "As vendas do período possuem base de custo suficiente."}
            actionLabel="Revisar custos"
            to="/admin/lucro"
            tone={reviewedRevenue > 0 ? "warning" : "success"}
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.85fr)]">
        <section className="min-w-0 rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel)] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4">
          <SectionHeading title="Vendido e recebido" action={<Link to="/financeiro"><Button variant="secondary">Abrir financeiro</Button></Link>} />
          {financeHasData ? (
            <>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[var(--jam-subtle)]">
                <Legend label="Vendido" color="#1d4ed8" />
                <Legend label="Recebido" color="#0f766e" />
              </div>
              <div className="mt-2 min-w-0" aria-label="Gráfico de vendido e recebido no período">
                <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                  <AreaChart data={salesVsReceiptsSeries} margin={isMobile ? { top: 12, right: 4, left: 0, bottom: 0 } : { top: 12, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashboard-sold" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.24} /><stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.02} /></linearGradient>
                      <linearGradient id="dashboard-received" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#0f766e" stopOpacity={0.22} /><stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} /></linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.16)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 11, fill: "var(--jam-subtle)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={isMobile ? 30 : 36} tickMargin={8} tickFormatter={(value: string) => formatShortAxisDate(value, isMobile)} />
                    {!isMobile ? <YAxis tick={{ fontSize: 11, fill: "var(--jam-subtle)" }} tickLine={false} axisLine={false} width={72} tickFormatter={formatCompactCurrency} /> : null}
                    <Tooltip formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value ?? 0)), name === "soldAmount" ? "Vendido" : "Recebido"]} labelFormatter={(label: unknown) => formatDate(typeof label === "string" ? label : null)} />
                    <Area type="monotone" dataKey="soldAmount" name="soldAmount" stroke="#1d4ed8" fill="url(#dashboard-sold)" strokeWidth={2.4} />
                    <Area type="monotone" dataKey="receivedAmount" name="receivedAmount" stroke="#0f766e" fill="url(#dashboard-received)" strokeWidth={2.4} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : <div className="mt-3"><AdminEmptyBlock title="Sem movimentação no período" message="Não há vendas ou recebimentos para comparar neste recorte." /></div>}
        </section>

        <section className="rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel)] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4">
          <SectionHeading title="Carteira" action={<Link to="/financeiro" className="text-[12px] font-semibold text-[var(--jam-accent)]">Ver títulos</Link>} />
          <dl className="mt-3 divide-y divide-[var(--jam-border)]">
            <PortfolioRow label="Em aberto" count={receivablesStatus.pending.count} value={receivablesStatus.pending.amount} tone="warning" />
            <PortfolioRow label="Parcial" count={receivablesStatus.partial.count} value={receivablesStatus.partial.amount} tone="neutral" />
            <PortfolioRow label="Quitado" count={receivablesStatus.paid.count} value={receivablesStatus.paid.amount} tone="success" />
          </dl>
        </section>
      </div>

      <section className="rounded-xl border border-[var(--jam-border)] bg-[var(--jam-panel)] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4">
        <SectionHeading title="Confiança do lucro" action={<Link to="/admin/lucro"><Button variant="secondary">Abrir lucro</Button></Link>} />
        {resultTotal > 0 ? (
          <dl className="mt-3 grid divide-y divide-[var(--jam-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <CoverageMetric label="Apurado" value={profitCoverage.confirmed.revenueAmount} note={`${profitCoverage.confirmed.visitItemsCount} item(ns) com custo real`} tone="success" />
            <CoverageMetric label="Em revisão" value={profitCoverage.reference.revenueAmount} note={`${profitCoverage.reference.visitItemsCount} item(ns) usando referência`} tone="warning" />
            <CoverageMetric label="Sem custo" value={profitCoverage.missing.revenueAmount} note={`${profitCoverage.missing.visitItemsCount} item(ns) sem base de custo`} tone="danger" />
          </dl>
        ) : <div className="mt-3"><AdminEmptyBlock title="Sem resultado para apurar" message="Ainda não há vendas concluídas neste período." /></div>}
        {reviewedRevenue > 0 ? <p className="mt-3 text-[12px] text-[var(--jam-subtle)]">{formatCurrency(reviewedRevenue)} em vendas ainda exige revisão de custo ({reviewedItems} item(ns)).</p> : null}
      </section>
    </div>
  );
}

function SummaryMetric({ label, value, note, tone }: { label: string; value: string; note: string; tone: "neutral" | "warning" | "success" }) {
  return <div className="min-w-0 px-3.5 py-3 sm:px-4"><dt className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--jam-subtle)]">{label}{tone !== "neutral" ? <ToneBadge label={tone === "warning" ? "Atenção" : "Ok"} tone={tone} /> : null}</dt><dd className="mt-2 font-display text-[1.32rem] font-semibold leading-none text-[var(--jam-ink)]">{value}</dd><p className="mt-2 text-[12px] leading-5 text-[var(--jam-subtle)]">{note}</p></div>;
}

function CoverageMetric({ label, value, note, tone }: { label: string; value: number; note: string; tone: "success" | "warning" | "danger" }) {
  return <div className="min-w-0 px-3.5 py-3 sm:px-4"><dt className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[var(--jam-ink)]">{label}<ToneBadge label={label} tone={tone} /></dt><dd className="mt-2 text-[15px] font-semibold text-[var(--jam-ink)]">{formatCurrency(value)}</dd><p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)]">{note}</p></div>;
}

function PortfolioRow({ label, count, value, tone }: { label: string; count: number; value: number; tone: "neutral" | "warning" | "success" }) {
  return <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><dt className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[var(--jam-ink)]">{label}{tone !== "neutral" ? <ToneBadge label={tone === "warning" ? "Atenção" : "Ok"} tone={tone} /> : null}</dt><p className="mt-0.5 text-[12px] text-[var(--jam-subtle)]">{count} título(s)</p></div><dd className="shrink-0 text-[14px] font-semibold text-[var(--jam-ink)]">{formatCurrency(value)}</dd></div>;
}

function SectionHeading({ title, action }: { title: string; action: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3"><h2 className="min-w-0 text-[15px] font-semibold text-[var(--jam-ink)] sm:text-base">{title}</h2><div className="shrink-0">{action}</div></div>;
}

function Legend({ label, color }: { label: string; color: string }) {
  return <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /><span>{label}</span></span>;
}

function DashboardActionRow({
  title,
  description,
  actionLabel,
  to,
  tone
}: {
  title: string;
  description: string;
  actionLabel: string;
  to: string;
  tone: "warning" | "success";
}) {
  return (
    <div className="flex flex-col gap-2.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-semibold text-[var(--jam-ink)] sm:text-sm">{title}</p>
          <ToneBadge label={tone === "warning" ? "Atenção" : "Ok"} tone={tone} />
        </div>
        <p className="mt-1 text-[12px] leading-5 text-[var(--jam-subtle)] sm:text-[13px]">{description}</p>
      </div>
      <Link to={to} className="shrink-0 self-start sm:self-auto">
        <Button variant="secondary">{actionLabel}</Button>
      </Link>
    </div>
  );
}

function createDefaultPeriod() { const today = new Date(); return { dateFrom: toDateValue(addDays(today, -29)), dateTo: toDateValue(today) }; }
function addDays(date: Date, days: number) { const nextDate = new Date(date); nextDate.setDate(nextDate.getDate() + days); return nextDate; }
function toDateValue(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function toSearchParams(filters: DashboardFilters) { const params = new URLSearchParams(); if (filters.dateFrom) params.set("dateFrom", filters.dateFrom); if (filters.dateTo) params.set("dateTo", filters.dateTo); return params; }
function formatShortAxisDate(value: string, isMobile = false) { const [, month, day] = value.split("-"); return !month || !day ? value : isMobile ? day : `${day}/${month}`; }
function formatCompactCurrency(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(value); }

function useIsMobileDashboard() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches);
  useEffect(() => { if (typeof window === "undefined") return; const media = window.matchMedia("(max-width: 639px)"); const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches); media.addEventListener("change", onChange); return () => media.removeEventListener("change", onChange); }, []);
  return isMobile;
}
