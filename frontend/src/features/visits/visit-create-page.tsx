import { PageHeader } from "../../components/ui";
import { VisitForm } from "./visit-form";

export function VisitCreatePage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Nova visita draft" subtitle="Abra a visita e depois registre os itens conferidos no local." />
      <VisitForm mode="create" />
    </div>
  );
}
