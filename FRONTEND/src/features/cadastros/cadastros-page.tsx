import { Link } from "react-router-dom";

import { Button, Card, PageHeader, ToneBadge } from "../../components/ui";

export function CadastrosPage() {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Cadastros" title="Base operacional" subtitle="Clientes, produtos e o catálogo configurado dentro de cada cliente." />

      <Link to="/clients">
        <Card className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--jam-ink)]">Clientes</p>
            <Button variant="ghost" className="min-h-0 px-0 text-xs">
              Abrir
            </Button>
          </div>
          <p className="text-sm text-[var(--jam-subtle)]">Cadastre lojas, contato, ciclo de visita e configurações comerciais.</p>
        </Card>
      </Link>

      <Link to="/products">
        <Card className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--jam-ink)]">Produtos</p>
            <Button variant="ghost" className="min-h-0 px-0 text-xs">
              Abrir
            </Button>
          </div>
          <p className="text-sm text-[var(--jam-subtle)]">Gerencie SKUs, descrição comercial e ativação dos produtos do consignado.</p>
        </Card>
      </Link>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--jam-ink)]">Configurar catálogo de um cliente</p>
          <ToneBadge label="Dentro do cliente" tone="neutral" />
        </div>
        <p className="text-sm text-[var(--jam-subtle)]">
          O catálogo não é uma área separada. Entre no cliente para definir preço atual, ordem e quantidade ideal dos produtos.
        </p>
        <Link to="/clients">
          <Button variant="secondary" className="w-full justify-between">
            <span>Abrir clientes</span>
            <span>→</span>
          </Button>
        </Link>
      </Card>
    </div>
  );
}
