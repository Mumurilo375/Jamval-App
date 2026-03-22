import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { EmptyState, PageHeader, PageLoader } from "../../components/ui";
import { getProduct } from "./products-api";
import { ProductForm } from "./product-form";

export function ProductEditPage() {
  const { productId = "" } = useParams();
  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProduct(productId)
  });

  if (productQuery.isPending) {
    return <PageLoader label="Carregando produto..." />;
  }

  if (productQuery.isError || !productQuery.data) {
    return <EmptyState title="Produto nao encontrado" message="Volte para a lista e tente abrir o item novamente." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Editar produto" subtitle={`${productQuery.data.sku} · preco base e custo de referencia`} />
      <ProductForm mode="edit" product={productQuery.data} />
    </div>
  );
}
