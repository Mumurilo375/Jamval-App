import { PageHeader } from "../../components/ui";
import { ProductForm } from "./product-form";

export function ProductCreatePage() {
  return (
    <div className="space-y-4">
      <PageHeader
        backTo="/products"
        backLabel="Produtos"
        title="Novo produto"
        subtitle="Cadastre SKU, preço base e custo de compra do produto."
      />
      <ProductForm mode="create" />
    </div>
  );
}
