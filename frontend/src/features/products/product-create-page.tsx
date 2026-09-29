import { FormPage } from "../../components/ui";
import { ProductForm } from "./product-form";

export function ProductCreatePage() {
  return <FormPage backTo="/products" backLabel="Produtos" title="Novo produto" subtitle="Cadastre SKU, preço base e custo de compra do produto.">
    <ProductForm mode="create" />
  </FormPage>;
}
