import { useLogout } from "../auth/auth";
import { Button, Card, PageHeader, ToneBadge } from "../../components/ui";

export function MorePage() {
  const logoutMutation = useLogout();

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Mais" title="Outras areas do app" subtitle="Recibos, comprovantes e configuracoes vao morar aqui sem competir com a operacao principal." />

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--jam-ink)]">Comprovantes</p>
          <ToneBadge label="Em breve" tone="neutral" />
        </div>
        <p className="text-sm text-[var(--jam-subtle)]">Consulta e reimpressao dos comprovantes das visitas concluidas.</p>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--jam-ink)]">Recibos</p>
          <ToneBadge label="Em breve" tone="neutral" />
        </div>
        <p className="text-sm text-[var(--jam-subtle)]">Documentos e historico visual dos recibos gerados pelo sistema.</p>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--jam-ink)]">Configuracoes</p>
          <ToneBadge label="Em breve" tone="neutral" />
        </div>
        <p className="text-sm text-[var(--jam-subtle)]">Ajustes operacionais e preferencias do ambiente vao aparecer aqui depois.</p>
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
          {logoutMutation.isPending ? "Saindo..." : "Sair da sessao"}
        </Button>
      </div>
    </div>
  );
}
