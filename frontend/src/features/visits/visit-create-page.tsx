import { FormPage } from "../../components/ui";
import { VisitForm } from "./visit-form";

export function VisitCreatePage() {
  return <FormPage backTo="/visits" backLabel="Visitas" title="Nova visita" subtitle="Abra a visita, confira os produtos e deixe o financeiro para o final.">
    <VisitForm mode="create" />
  </FormPage>;
}
