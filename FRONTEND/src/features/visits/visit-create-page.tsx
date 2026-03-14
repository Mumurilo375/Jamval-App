import { PageHeader } from "../../components/ui";
import { VisitForm } from "./visit-form";

export function VisitCreatePage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Nova visita" subtitle="Abra a visita, confira os produtos e deixe o financeiro para o final." />
      <VisitForm mode="create" />
    </div>
  );
}
