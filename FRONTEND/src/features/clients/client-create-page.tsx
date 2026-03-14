import { PageHeader } from "../../components/ui";
import { ClientForm } from "./client-form";

export function ClientCreatePage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Novo cliente" subtitle="Monte a base comercial antes de entrar em visitas e financeiro." />
      <ClientForm mode="create" />
    </div>
  );
}
