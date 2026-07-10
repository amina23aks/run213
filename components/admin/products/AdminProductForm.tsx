import type { FormEvent } from "react";
import type { ProductCategory, ProductStatus } from "@/types/product";
import { AdminProductField, AdminProductSection } from "@/components/admin/products/AdminProductFields";
import { AdminProductImagePreview } from "@/components/admin/products/AdminProductImagePreview";
import type { ProductDraft, ProductDraftColor } from "@/components/admin/products/types";

const sizeOptions = ["S", "M", "L", "XL", "XXL"] as const;

type AdminProductFormProps = {
  draft: ProductDraft;
  editingId: string | null;
  errors: string[];
  onAddColor: () => void;
  onAddImageUrl: () => void;
  onCancelEdit: () => void;
  onChange: <Key extends keyof ProductDraft>(key: Key, value: ProductDraft[Key]) => void;
  onColorChange: (id: string, patch: Partial<Omit<ProductDraftColor, "id">>) => void;
  onRemoveColor: (id: string) => void;
  onRemoveImage: (id: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleSize: (size: string) => void;
  onUploadImage: (file: File) => void;
  uploadingImage: boolean;
  cloudinaryConfigured: boolean;
};

export function AdminProductForm({
  draft,
  editingId,
  errors,
  onAddColor,
  onAddImageUrl,
  onCancelEdit,
  onChange,
  onColorChange,
  onRemoveColor,
  onRemoveImage,
  onSubmit,
  onToggleSize,
  onUploadImage,
  uploadingImage,
  cloudinaryConfigured,
}: AdminProductFormProps) {
  return (
    <form className="adminProductForm adminCard" onSubmit={onSubmit}>
      <div className="adminCard__heading">
        <p>{editingId ? "EDIT PRODUCT" : "CREATE PRODUCT"}</p>
        <h2>{editingId ? "Edit product" : "Create product"}</h2>
        <span>Use the compact editor. Values stay server-validated through the secure admin API.</span>
      </div>

      {errors.length ? (
        <div className="adminProductErrors" role="alert">
          <strong>Fix these before saving:</strong>
          <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </div>
      ) : null}

      <AdminProductSection eyebrow="01" title="Basic info">
        <div className="adminProductGrid adminProductGrid--two">
          <AdminProductField label="Product name" helper="Slug preview updates from your slug field.">
            <input placeholder="Oversized Tee" value={draft.name} onChange={(event) => onChange("name", event.target.value)} />
          </AdminProductField>
          <AdminProductField label="Slug" helper="Lowercase URL slug, e.g. oversized-tee.">
            <input placeholder="oversized-tee" value={draft.slug} onChange={(event) => onChange("slug", event.target.value)} />
          </AdminProductField>
        </div>
        <AdminProductField label="Description" helper="Short product description for product pages.">
          <textarea rows={3} placeholder="Built for daily movement..." value={draft.description} onChange={(event) => onChange("description", event.target.value)} />
        </AdminProductField>
      </AdminProductSection>

      <AdminProductSection eyebrow="02" title="Visibility / status">
        <div className="adminPillGroup" aria-label="Product status">
          {(["draft", "active", "archived"] as const).map((status) => (
            <button className={draft.status === status ? "isSelected" : undefined} key={status} type="button" onClick={() => onChange("status", status as ProductStatus)}>
              {status}
            </button>
          ))}
        </div>
        <div className="adminProductGrid adminProductGrid--two">
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

      <AdminProductSection eyebrow="04" title="Category / design / drop">
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
        <div className="adminPillGroup" aria-label="Stock mode">
          {(["unlimited", "limited"] as const).map((mode) => (
            <button className={draft.stockMode === mode ? "isSelected" : undefined} key={mode} type="button" onClick={() => onChange("stockMode", mode)}>
              {mode}
            </button>
          ))}
        </div>
        {draft.stockMode === "limited" ? (
          <AdminProductField label="Stock quantity" helper="Required when stock mode is limited.">
            <input inputMode="numeric" placeholder="25" value={draft.stockQty} onChange={(event) => onChange("stockQty", event.target.value)} />
          </AdminProductField>
        ) : <p className="adminProductHint">Unlimited stock does not require a quantity.</p>}
      </AdminProductSection>

      <AdminProductSection eyebrow="06" title="Sizes">
        <div className="adminSizeSelector" aria-label="Product sizes">
          {sizeOptions.map((size) => {
            const checked = draft.sizes.includes(size);
            return (
              <label className={checked ? "isSelected" : undefined} key={size}>
                <input type="checkbox" checked={checked} onChange={() => onToggleSize(size)} />
                <span>{size}</span>
              </label>
            );
          })}
        </div>
        <div className="adminSelectedPreview">
          <span>Selected</span>
          {draft.sizes.length ? draft.sizes.map((size) => <i key={size}>{size}</i>) : <small>No sizes selected. Good for accessories.</small>}
        </div>
      </AdminProductSection>

      <AdminProductSection eyebrow="07" title="Colors">
        <div className="adminColorRows">
          {draft.colors.map((color) => (
            <div className="adminColorRow" key={color.id}>
              <label className="adminColorPicker" aria-label={`Pick ${color.name || "color"}`}>
                <input type="color" value={isHexColor(color.hex) ? color.hex : "#000000"} onChange={(event) => onColorChange(color.id, { hex: event.target.value })} />
                <span style={{ backgroundColor: isHexColor(color.hex) ? color.hex : "#000000" }} />
              </label>
              <AdminProductField label="Color name">
                <input placeholder="Black" value={color.name} onChange={(event) => onColorChange(color.id, { name: event.target.value })} />
              </AdminProductField>
              <AdminProductField label="Hex">
                <input placeholder="#111111" value={color.hex} onChange={(event) => onColorChange(color.id, { hex: event.target.value })} />
              </AdminProductField>
              <button type="button" onClick={() => onRemoveColor(color.id)}>Remove</button>
            </div>
          ))}
        </div>
        <button className="adminInlineAdd" type="button" onClick={onAddColor}>+ Add color</button>
      </AdminProductSection>

      <AdminProductSection eyebrow="08" title="Images">
        <div className="adminUploadPanel">
          {cloudinaryConfigured ? (
            <label className={`adminUploadButton${uploadingImage ? " isBusy" : ""}`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingImage}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) onUploadImage(file);
                }}
              />
              <span>{uploadingImage ? "Uploading…" : "Upload image"}</span>
            </label>
          ) : (
            <button className="adminUploadButton" type="button" disabled>Cloudinary not configured</button>
          )}
          <span>JPG, PNG, or WEBP. Max 5MB. You can also add a URL/path below.</span>
        </div>
        <div className="adminProductInlineInput">
          <input placeholder="/tshirt.png" value={draft.imageUrlDraft} onChange={(event) => onChange("imageUrlDraft", event.target.value)} />
          <button type="button" onClick={onAddImageUrl}>Add URL/path</button>
        </div>
        <AdminProductImagePreview images={draft.images} onRemove={onRemoveImage} />
      </AdminProductSection>

      <AdminProductSection eyebrow="09" title="Homepage placement">
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

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}
