import type { FormEvent } from "react";
import type { ProductCategory, ProductStatus } from "@/types/product";
import { AdminProductField, AdminProductSection } from "@/components/admin/products/AdminProductFields";
import { AdminProductImagePreview } from "@/components/admin/products/AdminProductImagePreview";
import type { ParsedColor, ProductDraft } from "@/components/admin/products/types";

type AdminProductFormProps = {
  draft: ProductDraft;
  editingId: string | null;
  errors: string[];
  imageUrls: string[];
  parsedColors: ParsedColor[];
  parsedSizes: string[];
  onCancelEdit: () => void;
  onChange: <Key extends keyof ProductDraft>(key: Key, value: ProductDraft[Key]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AdminProductForm({
  draft,
  editingId,
  errors,
  imageUrls,
  parsedColors,
  parsedSizes,
  onCancelEdit,
  onChange,
  onSubmit,
}: AdminProductFormProps) {
  return (
    <form className="adminProductForm adminCard" onSubmit={onSubmit}>
      <div className="adminCard__heading">
        <p>{editingId ? "EDIT PRODUCT" : "CREATE PRODUCT"}</p>
        <h2>{editingId ? "Edit product" : "Create product"}</h2>
        <span>Clean product data keeps the storefront stable. Active products can appear publicly.</span>
      </div>

      {errors.length ? (
        <div className="adminProductErrors" role="alert">
          <strong>Fix these before saving:</strong>
          <ul>
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      ) : null}

      <AdminProductSection eyebrow="01" title="Basic info">
        <div className="adminProductGrid adminProductGrid--two">
          <AdminProductField label="Name" helper="Customer-facing product name.">
            <input placeholder="Oversized Tee" value={draft.name} onChange={(event) => onChange("name", event.target.value)} />
          </AdminProductField>
          <AdminProductField label="Slug" helper="Lowercase URL slug, e.g. oversized-tee.">
            <input placeholder="oversized-tee" value={draft.slug} onChange={(event) => onChange("slug", event.target.value)} />
          </AdminProductField>
        </div>
        <AdminProductField label="Description" helper="Short product description for product pages.">
          <textarea placeholder="Built for daily movement..." value={draft.description} onChange={(event) => onChange("description", event.target.value)} />
        </AdminProductField>
      </AdminProductSection>

      <AdminProductSection eyebrow="02" title="Visibility">
        <div className="adminProductGrid adminProductGrid--three">
          <AdminProductField label="Status" helper="Drafts stay hidden. Active products can appear publicly.">
            <select value={draft.status} onChange={(event) => onChange("status", event.target.value as ProductStatus)}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </AdminProductField>
          <ToggleCard label="In stock" checked={draft.inStock} onChange={(checked) => onChange("inStock", checked)} />
          <ToggleCard label="Promo" checked={draft.isPromo} onChange={(checked) => onChange("isPromo", checked)} />
        </div>
      </AdminProductSection>

      <AdminProductSection eyebrow="03" title="Pricing">
        <div className="adminProductGrid adminProductGrid--two">
          <AdminProductField label="Price DZD" helper="Required current selling price.">
            <input inputMode="numeric" placeholder="2900" value={draft.priceDzd} onChange={(event) => onChange("priceDzd", event.target.value)} />
          </AdminProductField>
          <AdminProductField label="Compare at price" helper="Optional old price for promo display.">
            <input inputMode="numeric" placeholder="3500" value={draft.compareAtPriceDzd} onChange={(event) => onChange("compareAtPriceDzd", event.target.value)} />
          </AdminProductField>
        </div>
      </AdminProductSection>

      <AdminProductSection eyebrow="04" title="Catalog">
        <div className="adminProductGrid adminProductGrid--three">
          <AdminProductField label="Category">
            <select value={draft.category} onChange={(event) => onChange("category", event.target.value as ProductCategory)}>
              <option value="tshirts">T-Shirts</option>
              <option value="pants">Pants</option>
              <option value="hoodies">Hoodies</option>
              <option value="accessories">Accessories</option>
            </select>
          </AdminProductField>
          <AdminProductField label="Drop slug" helper="Optional homepage drop grouping.">
            <select value={draft.dropSlug} onChange={(event) => onChange("dropSlug", event.target.value as ProductDraft["dropSlug"])}>
              <option value="">No drop</option>
              <option value="drop-001">drop-001</option>
            </select>
          </AdminProductField>
          <AdminProductField label="Sort order" helper="Lower numbers appear first.">
            <input inputMode="numeric" placeholder="100" value={draft.sortOrder} onChange={(event) => onChange("sortOrder", event.target.value)} />
          </AdminProductField>
        </div>
      </AdminProductSection>

      <AdminProductSection eyebrow="05" title="Stock">
        <div className="adminProductGrid adminProductGrid--two">
          <AdminProductField label="Stock mode">
            <select value={draft.stockMode} onChange={(event) => onChange("stockMode", event.target.value as ProductDraft["stockMode"])}>
              <option value="unlimited">Unlimited</option>
              <option value="limited">Limited</option>
            </select>
          </AdminProductField>
          <AdminProductField label="Stock quantity" helper="Only required when stock mode is limited.">
            <input inputMode="numeric" placeholder="25" value={draft.stockQty} onChange={(event) => onChange("stockQty", event.target.value)} />
          </AdminProductField>
        </div>
      </AdminProductSection>

      <AdminProductSection eyebrow="06" title="Variants">
        <div className="adminProductGrid adminProductGrid--two">
          <AdminProductField label="Colors" helper="One per line: Name|#HEX. Example Black|#111111">
            <textarea placeholder={'Black|#111111\nCream|#f5f1e8'} value={draft.colorsText} onChange={(event) => onChange("colorsText", event.target.value)} />
          </AdminProductField>
          <AdminProductField label="Sizes" helper="Comma-separated. Leave empty for accessories.">
            <input placeholder="S, M, L, XL" value={draft.sizesText} onChange={(event) => onChange("sizesText", event.target.value)} />
          </AdminProductField>
        </div>
        <div className="adminVariantPreview">
          <div>
            <span>Color preview</span>
            {parsedColors.length ? (
              <div className="adminColorDots">
                {parsedColors.map((color) => <i key={`${color.name}-${color.hex}`} style={{ backgroundColor: color.hex }} title={`${color.name} ${color.hex}`} />)}
              </div>
            ) : <small>No valid colors yet.</small>}
          </div>
          <div>
            <span>Size preview</span>
            {parsedSizes.length ? (
              <div className="adminSizePills">
                {parsedSizes.map((size) => <i key={size}>{size}</i>)}
              </div>
            ) : <small>No sizes. Good for accessories.</small>}
          </div>
        </div>
      </AdminProductSection>

      <AdminProductSection eyebrow="07" title="Images">
        <AdminProductField label="Image URLs / paths" helper="One URL/path per line. Example /tshirt.png. Cloudinary upload comes later.">
          <textarea placeholder="/tshirt.png" value={draft.imagesText} onChange={(event) => onChange("imagesText", event.target.value)} />
        </AdminProductField>
        <AdminProductImagePreview urls={imageUrls} />
      </AdminProductSection>

      <AdminProductSection eyebrow="08" title="Homepage placement">
        <div className="adminProductGrid adminProductGrid--three">
          <ToggleCard label="Show in DROP_001" checked={draft.showInDrop001} onChange={(checked) => onChange("showInDrop001", checked)} />
          <ToggleCard label="Show in Featured Drop" checked={draft.showInFeaturedDrop} onChange={(checked) => onChange("showInFeaturedDrop", checked)} />
          <ToggleCard label="Prepare for Shop The Look" checked={draft.showInShopTheLook} onChange={(checked) => onChange("showInShopTheLook", checked)} />
        </div>
        <div className="adminProductGrid adminProductGrid--two">
          <AdminProductField label="Featured sort order" helper="Optional order for Featured Drop.">
            <input inputMode="numeric" placeholder="10" value={draft.featuredSortOrder} onChange={(event) => onChange("featuredSortOrder", event.target.value)} />
          </AdminProductField>
          <AdminProductField label="Look group slug" helper="Future Shop The Look grouping.">
            <input placeholder="summer-road" value={draft.lookGroupSlug} onChange={(event) => onChange("lookGroupSlug", event.target.value)} />
          </AdminProductField>
        </div>
      </AdminProductSection>

      <div className="adminProductActions">
        <button className="adminPrimary" type="submit">{editingId ? "Save changes" : "Create product"}</button>
        {editingId ? <button type="button" onClick={onCancelEdit}>Cancel edit</button> : null}
      </div>
    </form>
  );
}

function ToggleCard({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="adminToggleCard">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
