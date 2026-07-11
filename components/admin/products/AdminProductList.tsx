import Image from "next/image";
import type { Product } from "@/types/product";

type AdminProductListProps = {
  products: Product[];
  nextCursor: string | null;
  onArchive: (id: string) => void;
  onEdit: (product: Product) => void;
  onLoadMore: (cursor: string) => void;
};

export function AdminProductList({ products, nextCursor, onArchive, onEdit, onLoadMore }: AdminProductListProps) {
  return (
    <section className="adminProductList adminCard">
      <div className="adminCard__heading">
        <p>PRODUCTS</p>
        <h2>Product list</h2>
        <span>Readable admin view. Archive hides products from the storefront.</span>
      </div>

      {products.length ? (
        <div className="adminProductList__items">
          {products.map((product) => <AdminProductListItem key={product.id} product={product} onArchive={onArchive} onEdit={onEdit} />)}
        </div>
      ) : (
        <div className="adminProductList__empty">
          <strong>No products loaded.</strong>
          <span>Create the first product or check admin access.</span>
        </div>
      )}

      {nextCursor ? <button className="adminProductList__more" type="button" onClick={() => onLoadMore(nextCursor)}>Load more</button> : null}
    </section>
  );
}

function AdminProductListItem({ product, onArchive, onEdit }: { product: Product; onArchive: (id: string) => void; onEdit: (product: Product) => void }) {
  const imageUrl = product.images[0]?.url;
  const placements = getPlacements(product);

  return (
    <article className="adminProductItem">
      <div className="adminProductItem__media">
        {imageUrl ? <Image src={imageUrl} alt={product.images[0]?.alt || product.name} width={96} height={112} unoptimized /> : <span>No image</span>}
      </div>

      <div className="adminProductItem__main">
        <div>
          <strong>{product.name}</strong>
          <small>{product.slug}</small>
        </div>
        <div className="adminProductItem__meta">
          <span className={`adminStatus adminStatus--${product.status}`}>{product.status}</span>
          <span>{product.category}</span>
          <span>{product.priceDzd.toLocaleString("fr-DZ")} DZD</span>
          <span>{product.stockMode === "limited" ? `${product.stockQty ?? 0} in stock` : product.stockMode}</span>
        </div>
        <div className="adminProductPlacements">
          {placements.length ? placements.map((placement) => <span key={placement}>{placement}</span>) : <span>No homepage placement</span>}
        </div>
      </div>

      <div className="adminProductItem__actions">
        <button type="button" onClick={() => onEdit(product)}>Edit</button>
        {product.status === "archived" ? <span className="adminProductArchivedNote">Archived</span> : <button type="button" onClick={() => onArchive(product.id)}>Archive</button>}
      </div>
    </article>
  );
}

function getPlacements(product: Product) {
  const placements: string[] = [];
  if (product.showInDrop001) placements.push("DROP_001");
  if (product.showInFeaturedDrop) placements.push("Featured");
  if (product.showInShopTheLook) placements.push("Look");
  return placements;
}
