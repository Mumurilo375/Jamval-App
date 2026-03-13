import { Card, PageHeader, ToneBadge } from "../../components/ui";

type AdminPlaceholderPageProps = {
  title: string;
  subtitle: string;
  description: string;
  previewItems: string[];
};

export function AdminPlaceholderPage({
  title,
  subtitle,
  description,
  previewItems
}: AdminPlaceholderPageProps) {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Administracao" title={title} subtitle={subtitle} />

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--jam-ink)]">Area em construcao</p>
          <ToneBadge label="Em breve" tone="neutral" />
        </div>
        <p className="text-sm text-[var(--jam-subtle)]">{description}</p>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-[var(--jam-ink)]">O que vai existir aqui</p>
        <div className="space-y-2">
          {previewItems.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-[var(--jam-border)] bg-white px-3.5 py-3 text-sm text-[var(--jam-subtle)]"
            >
              {item}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
