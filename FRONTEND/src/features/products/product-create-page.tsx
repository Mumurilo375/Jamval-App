import { PageHeader } from "../../components/ui";
import { ProductForm } from "./product-form";

export function ProductCreatePage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Novo produto" subtitle="Cadastre SKU, preco base e custo de referencia do produto." />
      <ProductForm mode="create" />
    </div>
  );
}
