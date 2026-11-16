import type { ProductQuery, SortKey } from "./catalog.functions";

export type ShopSearch = {
  search?: string | undefined;
  category?: string | undefined;
  brand?: string | undefined;
  sort?: SortKey | undefined;
  page?: number | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  minRating?: number | undefined;
  inStockOnly?: boolean | undefined;
  onSaleOnly?: boolean | undefined;
  organicOnly?: boolean | undefined;
  featuredOnly?: boolean | undefined;
  flashSaleOnly?: boolean | undefined;
};

const SORTS: SortKey[] = ["latest", "best_selling", "price_asc", "price_desc", "popular", "rating"];

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : undefined;
}
function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
function flag(v: unknown): boolean | undefined {
  return v === true || v === "true" || v === 1 || v === "1" ? true : undefined;
}

export function parseShopSearch(input: Record<string, unknown>): ShopSearch {
  const sort = SORTS.includes(input["sort"] as SortKey) ? (input["sort"] as SortKey) : undefined;
  const page = num(input["page"]);
  return {
    search: str(input["search"]),
    category: str(input["category"]),
    brand: str(input["brand"]),
    sort,
    page: page && page > 1 ? Math.floor(page) : undefined,
    minPrice: num(input["minPrice"]),
    maxPrice: num(input["maxPrice"]),
    minRating: num(input["minRating"]),
    inStockOnly: flag(input["inStockOnly"]),
    onSaleOnly: flag(input["onSaleOnly"]),
    organicOnly: flag(input["organicOnly"]),
    featuredOnly: flag(input["featuredOnly"]),
    flashSaleOnly: flag(input["flashSaleOnly"]),
  };
}

export const PER_PAGE = 20;

export function toProductQuery(search: ShopSearch, categorySlug?: string): ProductQuery {
  return {
    categorySlug: categorySlug ?? search.category,
    brandSlug: search.brand,
    search: search.search,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    minRating: search.minRating,
    inStockOnly: search.inStockOnly,
    onSaleOnly: search.onSaleOnly,
    organicOnly: search.organicOnly,
    featuredOnly: search.featuredOnly,
    flashSaleOnly: search.flashSaleOnly,
    sort: search.sort ?? "latest",
    page: search.page ?? 1,
    perPage: PER_PAGE,
  };
}
