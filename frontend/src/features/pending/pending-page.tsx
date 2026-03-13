import { Button, Card, PageHeader, ToneBadge } from "../../components/ui";

export function PendingPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Operacao"
        title="Financeiro"
        subtitle="Esta area concentra titulos em aberto, pagamentos posteriores e o acompanhamento da cobranca."
      />

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--jam-ink)]">Area em preparacao</p>
          <ToneBadge label="Em breve" tone="neutral" />
        </div>
        <p className="text-sm text-[var(--jam-subtle)]">
          Aqui vao aparecer receivables, pagamentos posteriores, vencimentos e o acompanhamento da cobranca.
        </p>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-[var(--jam-ink)]">O que vai existir aqui</p>
        <div className="space-y-2">
          <div className="rounded-xl border border-[var(--jam-border)] bg-white px-3.5 py-3 text-sm text-[var(--jam-subtle)]">Titulos pendentes por cliente</div>
          <div className="rounded-xl border border-[var(--jam-border)] bg-white px-3.5 py-3 text-sm text-[var(--jam-subtle)]">Cobrancas e vencimentos proximos</div>
          <div className="rounded-xl border border-[var(--jam-border)] bg-white px-3.5 py-3 text-sm text-[var(--jam-subtle)]">Registro de pagamentos posteriores</div>
        </div>
      </Card>

      <Button variant="secondary" className="w-full" disabled>
        Fluxo financeiro em breve
      </Button>
    </div>
  );
}
