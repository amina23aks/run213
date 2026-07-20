import { formatDzd } from "@/constants/products";

type LookPriceDisplayProps = {
  priceDzd: number;
  compareAtPriceDzd?: number | null;
  discountPercent?: number | null;
  isPromo?: boolean;
  savingsLabel?: string;
  className?: string;
  regularLabel?: string;
};

export function getLookPromoState({ priceDzd, compareAtPriceDzd, discountPercent, isPromo }: Pick<LookPriceDisplayProps, "priceDzd" | "compareAtPriceDzd" | "discountPercent" | "isPromo">) {
  const hasValidCompareAt = typeof compareAtPriceDzd === "number" && Number.isFinite(compareAtPriceDzd) && compareAtPriceDzd > priceDzd;
  const hasValidDiscount = typeof discountPercent === "number" && Number.isFinite(discountPercent) && discountPercent > 0;
  const isValidPromo = isPromo === true && hasValidCompareAt && hasValidDiscount;
  const savingsDzd = isValidPromo ? Math.max((compareAtPriceDzd ?? 0) - priceDzd, 0) : 0;
  return { isValidPromo, savingsDzd, discountPercent: isValidPromo ? Math.round(discountPercent ?? 0) : 0 };
}

export function LookPriceDisplay({ priceDzd, compareAtPriceDzd, discountPercent, isPromo, savingsLabel, className, regularLabel }: LookPriceDisplayProps) {
  const promo = getLookPromoState({ priceDzd, compareAtPriceDzd, discountPercent, isPromo });
  const label = promo.savingsDzd > 0 && savingsLabel ? savingsLabel.replace("{amount}", formatDzd(promo.savingsDzd)) : null;

  return (
    <div className={className ? `lookPriceDisplay ${className}` : "lookPriceDisplay"}>
      <div className="lookPriceDisplay__row">
        {regularLabel ? <span className="lookPriceDisplay__label">{regularLabel}</span> : null}
        <strong>{formatDzd(priceDzd)}</strong>
        {promo.isValidPromo ? <><del>{formatDzd(compareAtPriceDzd ?? 0)}</del><em>-{promo.discountPercent}%</em></> : null}
      </div>
      {label ? <p className="lookPriceDisplay__saving">{label}</p> : null}
    </div>
  );
}
