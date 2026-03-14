import { PageHeader } from "../../components/ui";
import { ProductForm } from "./product-form";

export function ProductCreatePage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Novo produto" subtitle="Cadastre um SKU base para comecar a operar no app." />
      <ProductForm mode="create" />
    </div>
  );
}
