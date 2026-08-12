import { Link } from "react-router-dom";

import { useLogout } from "../auth/auth";
import { Button, Card, PageHeader, ToneBadge } from "../../components/ui";

export function MorePage() {
  const logoutMutation = useLogout();

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Mais" title="Outras áreas do app" subtitle="Recibos, comprovantes e configurações vão morar aqui sem competir com a operação principal." />

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--jam-ink)]">Estoque central</p>
          <ToneBadge label="Novo" tone="success" />
        </div>
        <p className="text-sm text-[var(--jam-subtle)]">Consulta de saldo, histórico do estoque e saídas das visitas para clientes.</p>
        <Link to="/stock">
          <Button variant="secondary" className="w-full justify-between">
            <span>Abrir estoque</span>
            <span>→</span>
          </Button>
        </Link>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--jam-ink)]">Comprovantes</p>
          <ToneBadge label="Em breve" tone="neutral" />
        </div>
        <p className="text-sm text-[var(--jam-subtle)]">Consulta e reimpressão dos comprovantes das visitas concluídas.</p>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--jam-ink)]">Recibos</p>
          <ToneBadge label="Em breve" tone="neutral" />
        </div>
        <p className="text-sm text-[var(--jam-subtle)]">Documentos e histórico visual dos recibos gerados pelo sistema.</p>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--jam-ink)]">Configurações</p>
          <ToneBadge label="Em breve" tone="neutral" />
        </div>
        <p className="text-sm text-[var(--jam-subtle)]">Ajustes operacionais e preferências do ambiente vão aparecer aqui depois.</p>
      </Card>

      <div className="pt-3">
        <Button
          variant="ghost"
          className="w-full border border-[var(--jam-border)]"
          onClick={() => {
            void logoutMutation.mutateAsync();
          }}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? "Saindo..." : "Sair da sessão"}
        </Button>
      </div>
    </div>
  );
}
