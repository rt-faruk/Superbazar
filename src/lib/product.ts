import type { Product } from "./types";

type Priced = Pick<
  Product,
  "price" | "compare_at_price" | "flash_sale_price" | "flash_sale_ends_at" | "is_flash_sale"
>;

export function isFlashActive(product: Priced): boolean {
  if (!product.is_flash_sale || product.flash_sale_price == null) return false;
  if (!product.flash_sale_ends_at) return true;
  return new Date(product.flash_sale_ends_at).getTime() > Date.now();
}

/** The price a shopper actually pays: flash-sale price while it is running. */
export function effectivePrice(product: Priced): number {
  return isFlashActive(product) ? Number(product.flash_sale_price) : Number(product.price);
}

/** What the item "would" have cost, for the strike-through. */
export function listPrice(product: Priced): number {
  const paid = effectivePrice(product);
  const compare = product.compare_at_price == null ? null : Number(product.compare_at_price);
  if (compare && compare > paid) return compare;
  if (isFlashActive(product) && Number(product.price) > paid) return Number(product.price);
  return paid;
}

export function stockState(product: { stock_quantity: number; low_stock_threshold: number }) {
  if (product.stock_quantity <= 0) return "out" as const;
  if (product.stock_quantity <= product.low_stock_threshold) return "low" as const;
  return "in" as const;
}
