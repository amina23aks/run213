import Image from "next/image";
import type { FormEvent } from "react";
import type { ProductCategory } from "@/types/product";
import { AdminProductField, AdminProductSection } from "@/components/admin/products/AdminProductFields";
import { AdminProductImagePreview } from "@/components/admin/products/AdminProductImagePreview";
import type { ProductDraft, ProductDraftColor, ProductDraftImage } from "@/components/admin/products/types";

const sizeOptions = ["S", "M", "L", "XL", "XXL"] as const;
const categories: { value: ProductCategory; label: string }[] = [
  { value: "tshirts", label: "T-Shirts" },
  { value: "hoodies", label: "Hoodies" },
  { value: "pants", label: "Pants" },
  { value: "accessories", label: "Accessories" },
];

type AdminProductFormProps = {
  draft: ProductDraft;
  editingId: string | null;
  errors: string[];
  onAddColor: () => void;
  onCancelEdit: () => void;
  onChange: <Key extends keyof ProductDraft>(key: Key, value: ProductDraft[Key]) => void;
  onColorChange: (id: string, patch: Partial<Omit<ProductDraftColor, "id">>) => void;
  onRemoveColor: (id: string) => void;
  onRemoveImage: (id: string) => void;
  onUpdateImage: (id: string, patch: Partial<ProductDraftImage>) => void;
  onSetPrimaryImage: (id: string) => void;
  onMoveImage: (id: string, direction: -1 | 1) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleSize: (size: string) => void;
  onUploadImage: (file: File) => void;
  onUploadSizeGuide: (file: File) => void;
  uploadingImage: boolean;
  uploadingSizeGuide: boolean;
  cloudinaryConfigured: boolean;
};

export function AdminProductForm({ draft, editingId, errors, onAddColor, onCancelEdit, onChange, onColorChange, onRemoveColor, onRemoveImage, onUpdateImage, onSetPrimaryImage, onMoveImage, onSubmit, onToggleSize, onUploadImage, onUploadSizeGuide, uploadingImage, uploadingSizeGuide, cloudinaryConfigured }: AdminProductFormProps) {
  const slugPreview = slugify(draft.name);
  const basePrice = Number(draft.basePriceDzd || draft.priceDzd || 0);
  const sellingPrice = Number(draft.priceDzd || 0);
  const costPrice = Number(draft.costPriceDzd || 0);
  const estimatedProfit = sellingPrice > 0 && costPrice > 0 ? sellingPrice - costPrice : 0;
  const estimatedMargin = sellingPrice > 0 && estimatedProfit > 0 ? Math.round((estimatedProfit / sellingPrice) * 100) : 0;

  return (
    <form className="adminProductForm adminCard" onSubmit={onSubmit}>
      <div className="adminCard__heading">
        <p>{editingId ? "EDIT PRODUCT" : "CREATE PRODUCT"}</p>
        <h2>{editingId ? "Edit product" : "Create product"}</h2>
        <span>Compact product editor. Slugs are generated from the product name.</span>
      </div>

      {errors.length ? <div className="adminProductErrors" role="alert"><strong>Fix these before saving:</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}

      <AdminProductSection eyebrow="01" title="Basics">
        <div className="adminProductGrid adminProductGrid--two">
          <AdminProductField label="Product name" helper={`Slug: ${slugPreview || "product-name"}`}><input placeholder="Oversized Tee" value={draft.name} onChange={(event) => onChange("name", event.target.value)} /></AdminProductField>
          <AdminProductField label="Visibility"><div className="adminPillGroup">{(["draft", "active"] as const).map((status) => <button className={draft.status === status ? "isSelected" : undefined} key={status} type="button" onClick={() => onChange("status", status)}>{status}</button>)}</div></AdminProductField>
        </div>
        <AdminProductField label="Description"><textarea rows={2} placeholder="Built for daily movement..." value={draft.description} onChange={(event) => onChange("description", event.target.value)} /></AdminProductField>
      </AdminProductSection>

      <AdminProductSection eyebrow="02" title="Category">
        <div className="adminPillGroup adminPillGroup--wrap">{categories.map((category) => <button className={draft.category === category.value ? "isSelected" : undefined} key={category.value} type="button" onClick={() => onChange("category", category.value)}>{category.label}</button>)}</div>
      </AdminProductSection>

      <AdminProductSection eyebrow="03" title="Pricing">
        <div className="adminProductGrid adminProductGrid--three">
          <AdminProductField label="Base price"><input inputMode="numeric" placeholder="3500" value={draft.basePriceDzd} onChange={(event) => onChange("basePriceDzd", event.target.value)} /></AdminProductField>
          <AdminProductField label="Selling price"><input inputMode="numeric" placeholder="2900" value={draft.priceDzd} onChange={(event) => onChange("priceDzd", event.target.value)} /></AdminProductField>
          <AdminProductField label="Discount %"><input inputMode="numeric" placeholder="0" value={draft.discountPercent} onChange={(event) => onChange("discountPercent", event.target.value)} /></AdminProductField>
          <AdminProductField label="Cost price"><input inputMode="numeric" placeholder="1600" value={draft.costPriceDzd} onChange={(event) => onChange("costPriceDzd", event.target.value)} /></AdminProductField>
          <AdminProductField label="Compare-at display"><input inputMode="numeric" placeholder={basePrice ? String(basePrice) : "3500"} value={draft.compareAtPriceDzd} onChange={(event) => onChange("compareAtPriceDzd", event.target.value)} /></AdminProductField>
          <div className="adminPricingStats"><span>Profit: {estimatedProfit.toLocaleString("fr-DZ")} DZD</span><span>Margin: {estimatedMargin}%</span></div>
        </div>
        <div className="adminProductGrid adminProductGrid--two"><ToggleCard label="Promo display" checked={draft.isPromo} onChange={(checked) => onChange("isPromo", checked)} /><ToggleCard label="Featured display" checked={draft.featured} onChange={(checked) => onChange("featured", checked)} /></div>
      </AdminProductSection>

      <AdminProductSection eyebrow="04" title="Stock and sizes">
        <div className="adminPillGroup">{(["unlimited", "limited"] as const).map((mode) => <button className={draft.stockMode === mode ? "isSelected" : undefined} key={mode} type="button" onClick={() => onChange("stockMode", mode)}>{mode}</button>)}</div>
        {draft.stockMode === "limited" ? <AdminProductField label="Stock quantity"><input inputMode="numeric" placeholder="25" value={draft.stockQty} onChange={(event) => onChange("stockQty", event.target.value)} /></AdminProductField> : <p className="adminProductHint">Unlimited stock does not require a quantity.</p>}
        <div className="adminSizeSelector">{sizeOptions.map((size) => <label className={draft.sizes.includes(size) ? "isSelected" : undefined} key={size}><input type="checkbox" checked={draft.sizes.includes(size)} onChange={() => onToggleSize(size)} /><span>{size}</span></label>)}</div>
        <div className="adminSelectedPreview"><span>Selected</span>{draft.sizes.length ? draft.sizes.map((size) => <i key={size}>{size}</i>) : <small>No sizes selected. Good for accessories.</small>}</div>
      </AdminProductSection>

      <AdminProductSection eyebrow="05" title="Images">
        <UploadButton label="Upload product image" busy={uploadingImage} disabled={!cloudinaryConfigured} onUpload={onUploadImage} />
        <AdminProductImagePreview images={draft.images} colors={draft.colors} onRemove={onRemoveImage} onUpdate={onUpdateImage} onSetPrimary={onSetPrimaryImage} onMove={onMoveImage} />
        <ToggleCard label="Enable size guide" checked={draft.sizeGuideEnabled} onChange={(checked) => onChange("sizeGuideEnabled", checked)} />
        {draft.sizeGuideEnabled ? <><UploadButton label="Upload size guide" busy={uploadingSizeGuide} disabled={!cloudinaryConfigured} onUpload={onUploadSizeGuide} />{draft.sizeGuideImageUrl ? <figure className="adminSizeGuideThumb"><Image src={draft.sizeGuideImageUrl} alt="Size guide preview" width={120} height={120} unoptimized /><button type="button" onClick={() => { onChange("sizeGuideImageUrl", ""); onChange("sizeGuideImagePublicId", ""); }}>Remove</button></figure> : null}</> : null}
      </AdminProductSection>

      <AdminProductSection eyebrow="06" title="Colors and placement">
        <div className="adminColorRows">{draft.colors.map((color) => <div className="adminColorRow" key={color.id}><label className="adminColorPicker"><input type="color" value={isHexColor(color.hex) ? color.hex : "#000000"} onChange={(event) => onColorChange(color.id, { hex: event.target.value })} /><span style={{ backgroundColor: isHexColor(color.hex) ? color.hex : "#000000" }} /></label><AdminProductField label="Name"><input placeholder="Black" value={color.name} onChange={(event) => onColorChange(color.id, { name: event.target.value })} /></AdminProductField><AdminProductField label="Hex"><input placeholder="#111111" value={color.hex} onChange={(event) => onColorChange(color.id, { hex: event.target.value })} /></AdminProductField><button type="button" onClick={() => onRemoveColor(color.id)}>Remove</button></div>)}</div>
        <button className="adminInlineAdd" type="button" onClick={onAddColor}>+ Add color</button>
        <div className="adminProductGrid adminProductGrid--two"><ToggleCard label="DROP_001" checked={draft.showInDrop001} onChange={(checked) => onChange("showInDrop001", checked)} /><ToggleCard label="Featured Drop" checked={draft.showInFeaturedDrop} onChange={(checked) => onChange("showInFeaturedDrop", checked)} /></div>
        <div className="adminProductGrid adminProductGrid--two"><AdminProductField label="Sort"><input inputMode="numeric" value={draft.sortOrder} onChange={(event) => onChange("sortOrder", event.target.value)} /></AdminProductField><AdminProductField label="Featured sort"><input inputMode="numeric" value={draft.featuredSortOrder} onChange={(event) => onChange("featuredSortOrder", event.target.value)} /></AdminProductField></div>
      </AdminProductSection>

      <div className="adminProductActions"><button className="adminPrimary" type="submit">{editingId ? "Save changes" : "Create product"}</button>{editingId ? <button type="button" onClick={onCancelEdit}>Cancel edit</button> : null}</div>
    </form>
  );
}

function UploadButton({ label, busy, disabled, onUpload }: { label: string; busy: boolean; disabled: boolean; onUpload: (file: File) => void }) {
  return <div className="adminUploadPanel"><label className={`adminUploadButton${busy ? " isBusy" : ""}`}><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || disabled} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onUpload(file); }} /><span>{disabled ? "Cloudinary not configured" : busy ? "Uploading…" : label}</span></label><span>JPG, PNG, or WEBP. Max 5MB.</span></div>;
}

function ToggleCard({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="adminToggleCard"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>; }
function isHexColor(value: string) { return /^#[0-9a-fA-F]{6}$/.test(value); }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }
