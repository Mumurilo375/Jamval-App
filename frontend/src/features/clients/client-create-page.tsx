import { FormPage } from "../../components/ui";
import { ClientForm } from "./client-form";

export function ClientCreatePage() {
  return <FormPage backTo="/clients" backLabel="Clientes" title="Novo cliente" subtitle="Monte a base comercial antes de entrar em visitas e financeiro.">
    <ClientForm mode="create" />
  </FormPage>;
}
