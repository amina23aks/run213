import type { Product } from "@/types/product";

export type LookPricingMode = "regular" | "sale";

export type LookPricingTotals = {
  sumProductSellingPrices: number;
  totalLookCost: number;
  missingCostProductNames: string[];
};

export type LookPricingResult = LookPricingTotals & {
  mode: LookPricingMode;
  discountPercent: number;
  lookSellingPrice: number;
  compareAtPriceDzd: number | null;
  customerSaving: number;
  estimatedProfit: number;
  profitMarginPercent: number;
  isPromo: boolean;
  belowCost: boolean;
};

type ProductPricingSource = Pick<Product, "name" | "priceDzd" | "costPriceDzd">;

export function calculateLookProductTotals(products: ProductPricingSource[]): LookPricingTotals {
  return products.reduce<LookPricingTotals>((totals, product) => {
    const cost = typeof product.costPriceDzd === "number" && Number.isFinite(product.costPriceDzd) ? product.costPriceDzd : 0;
    return {
      sumProductSellingPrices: totals.sumProductSellingPrices + product.priceDzd,
      totalLookCost: totals.totalLookCost + cost,
      missingCostProductNames: cost > 0 ? totals.missingCostProductNames : [...totals.missingCostProductNames, product.name],
    };
  }, { sumProductSellingPrices: 0, totalLookCost: 0, missingCostProductNames: [] });
}

export function calculateLookPricing(input: { mode: LookPricingMode; enteredPriceDzd: number; discountPercent: number; products: ProductPricingSource[] }): LookPricingResult {
  const totals = calculateLookProductTotals(input.products);
  const discountPercent = clampPercent(input.discountPercent);
  const lookSellingPrice = input.mode === "sale" ? Math.round(totals.sumProductSellingPrices * (1 - discountPercent / 100)) : Math.max(0, Math.round(input.enteredPriceDzd));
  const customerSaving = Math.max(totals.sumProductSellingPrices - lookSellingPrice, 0);
  const estimatedProfit = lookSellingPrice - totals.totalLookCost;
  return {
    ...totals,
    mode: input.mode,
    discountPercent: input.mode === "sale" ? discountPercent : 0,
    lookSellingPrice,
    compareAtPriceDzd: customerSaving > 0 ? totals.sumProductSellingPrices : null,
    customerSaving,
    estimatedProfit,
    profitMarginPercent: lookSellingPrice > 0 ? Math.round((estimatedProfit / lookSellingPrice) * 100) : 0,
    isPromo: input.mode === "sale" && discountPercent > 0,
    belowCost: lookSellingPrice < totals.totalLookCost,
  };
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.trunc(value)));
}
