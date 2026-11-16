import { createServerFn } from "@tanstack/react-start";

import { publicClient } from "./public-client";
import type {
  Banner,
  Brand,
  Category,
  Coupon,
  Order,
  OrderEvent,
  OrderItem,
  Product,
  ProductCard,
  ProductImage,
  ProductVariant,
  Review,
  ShippingMethod,
  WebsiteSettings,
} from "./types";

export type SortKey =
  | "latest"
  | "best_selling"
  | "price_asc"
  | "price_desc"
  | "popular"
  | "rating";

export type ProductQuery = {
  categorySlug?: string | undefined;
  brandSlug?: string | undefined;
  search?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  minRating?: number | undefined;
  inStockOnly?: boolean | undefined;
  onSaleOnly?: boolean | undefined;
  organicOnly?: boolean | undefined;
  featuredOnly?: boolean | undefined;
  flashSaleOnly?: boolean | undefined;
  sort?: SortKey | undefined;
  page?: number | undefined;
  perPage?: number | undefined;
};

export type ProductPage = {
  items: ProductCard[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

/** One literal string so supabase-js can type the rows it returns. */
const PRODUCT_COLUMNS =
  "id, name, slug, short_description, description, category_id, brand_id, sku, unit_label, price, compare_at_price, stock_quantity, low_stock_threshold, rating_avg, rating_count, sold_count, is_active, is_featured, is_flash_sale, flash_sale_price, flash_sale_ends_at, is_organic, ingredients, specifications, tags, image_url, is_on_sale, created_at" as const;

function num(value: string | number | null): number {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Attach photos, category and brand names to plain product rows. */
async function decorate(rows: Product[]): Promise<ProductCard[]> {
  if (rows.length === 0) return [];
  const sb = publicClient();
  const ids = rows.map((row) => row.id);
  const [imagesResult, categoriesResult, brandsResult] = await Promise.all([
    sb
      .from("product_images")
      .select("product_id, url, alt, sort_order")
      .in("product_id", ids)
      .order("sort_order", { ascending: true }),
    sb.from("categories").select("id, name, slug"),
    sb.from("brands").select("id, name, slug"),
  ]);

  const photos = new Map<string, string[]>();
  for (const image of (imagesResult.data ?? []) as Pick<ProductImage, "product_id" | "url">[]) {
    const list = photos.get(image.product_id) ?? [];
    list.push(image.url);
    photos.set(image.product_id, list);
  }
  const categoryNames = new Map(
    (categoriesResult.data ?? []).map((c) => [c.id, { name: c.name, slug: c.slug }]),
  );
  const brandNames = new Map((brandsResult.data ?? []).map((b) => [b.id, b.name]));

  return rows.map((row) => {
    const category = row.category_id ? categoryNames.get(row.category_id) : undefined;
    return {
      ...row,
      price: num(row.price),
      compare_at_price: row.compare_at_price == null ? null : num(row.compare_at_price),
      flash_sale_price: row.flash_sale_price == null ? null : num(row.flash_sale_price),
      rating_avg: num(row.rating_avg),
      category_name: category?.name ?? null,
      category_slug: category?.slug ?? null,
      brand_name: row.brand_id ? (brandNames.get(row.brand_id) ?? null) : null,
      image_urls: photos.get(row.id) ?? (row.image_url ? [row.image_url] : []),
    };
  });
}

async function categoryIdsFor(slug: string): Promise<string[]> {
  const sb = publicClient();
  const parent = await sb.from("categories").select("id").eq("slug", slug).maybeSingle();
  if (!parent.data) return [];
  const children = await sb.from("categories").select("id").eq("parent_id", parent.data.id);
  return [parent.data.id, ...(children.data ?? []).map((c) => c.id)];
}

const SORTS: Record<SortKey, { column: string; ascending: boolean }[]> = {
  latest: [{ column: "created_at", ascending: false }],
  best_selling: [{ column: "sold_count", ascending: false }],
  price_asc: [{ column: "price", ascending: true }],
  price_desc: [{ column: "price", ascending: false }],
  popular: [
    { column: "rating_count", ascending: false },
    { column: "sold_count", ascending: false },
  ],
  rating: [{ column: "rating_avg", ascending: false }],
};

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((input: ProductQuery | undefined) => input ?? {})
  .handler(async ({ data }): Promise<ProductPage> => {
    const sb = publicClient();
    const page = Math.max(1, data.page ?? 1);
    const perPage = Math.min(60, Math.max(1, data.perPage ?? 12));

    let query = sb
      .from("products")
      .select(PRODUCT_COLUMNS, { count: "exact" })
      .eq("is_active", true);

    if (data.categorySlug) {
      const ids = await categoryIdsFor(data.categorySlug);
      if (ids.length === 0) {
        return { items: [], total: 0, page, perPage, totalPages: 0 };
      }
      query = query.in("category_id", ids);
    }
    if (data.brandSlug) {
      const brand = await sb.from("brands").select("id").eq("slug", data.brandSlug).maybeSingle();
      if (!brand.data) {
        return { items: [], total: 0, page, perPage, totalPages: 0 };
      }
      query = query.eq("brand_id", brand.data.id);
    }
    if (data.search) {
      const term = `%${data.search.trim().replace(/[,()]/g, " ")}%`;
      query = query.or(`name.ilike.${term},short_description.ilike.${term}`);
    }
    if (data.minPrice != null) query = query.gte("price", data.minPrice);
    if (data.maxPrice != null) query = query.lte("price", data.maxPrice);
    if (data.minRating != null) query = query.gte("rating_avg", data.minRating);
    if (data.inStockOnly) query = query.gt("stock_quantity", 0);
    if (data.onSaleOnly) query = query.eq("is_on_sale", true);
    if (data.organicOnly) query = query.eq("is_organic", true);
    if (data.featuredOnly) query = query.eq("is_featured", true);
    if (data.flashSaleOnly) {
      query = query.eq("is_flash_sale", true).gt("flash_sale_ends_at", new Date().toISOString());
    }

    for (const sort of SORTS[data.sort ?? "latest"]) {
      query = query.order(sort.column, { ascending: sort.ascending });
    }

    const from = (page - 1) * perPage;
    const { data: rows, count } = await query.range(from, from + perPage - 1);
    const total = count ?? 0;
    const items = await decorate((rows ?? []) as Product[]);

    return {
      items,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  });

export type ProductDetail = {
  product: ProductCard;
  images: ProductImage[];
  variants: ProductVariant[];
  reviews: Review[];
  related: ProductCard[];
};

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }): Promise<ProductDetail | null> => {
    const sb = publicClient();
    const { data: row } = await sb
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!row) return null;

    const [images, variants, reviews, relatedRows] = await Promise.all([
      sb
        .from("product_images")
        .select("*")
        .eq("product_id", row.id)
        .order("sort_order", { ascending: true }),
      sb
        .from("product_variants")
        .select("*")
        .eq("product_id", row.id)
        .order("sort_order", { ascending: true }),
      sb
        .from("reviews")
        .select("*")
        .eq("product_id", row.id)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("is_active", true)
        .eq("category_id", row.category_id ?? "00000000-0000-0000-0000-000000000000")
        .neq("id", row.id)
        .order("sold_count", { ascending: false })
        .limit(8),
    ]);

    const [card] = await decorate([row as Product]);
    if (!card) return null;
    const related = await decorate((relatedRows.data ?? []) as Product[]);

    return {
      product: card,
      images: (images.data ?? []) as ProductImage[],
      variants: (variants.data ?? []) as ProductVariant[],
      reviews: (reviews.data ?? []) as Review[],
      related,
    };
  });

export const listCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<Category[]> => {
    const { data } = await publicClient()
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    return (data ?? []) as Category[];
  },
);

export const listBrands = createServerFn({ method: "GET" }).handler(async (): Promise<Brand[]> => {
  const { data } = await publicClient()
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as Brand[];
});

export const listBanners = createServerFn({ method: "GET" })
  .inputValidator((input: { position?: string } | undefined) => input ?? {})
  .handler(async ({ data }): Promise<Banner[]> => {
    const { data: rows } = await publicClient()
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    const now = Date.now();
    return ((rows ?? []) as Banner[]).filter(
      (banner) =>
        (banner.position ?? "hero") === (data.position ?? "hero") &&
        (!banner.starts_at || new Date(banner.starts_at).getTime() <= now) &&
        (!banner.ends_at || new Date(banner.ends_at).getTime() > now),
    );
  });

export const listShippingMethods = createServerFn({ method: "GET" }).handler(
  async (): Promise<ShippingMethod[]> => {
    const { data } = await publicClient()
      .from("shipping_methods")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    return (data ?? []) as ShippingMethod[];
  },
);

export const DEFAULT_SETTINGS = {
  id: 1,
  site_name: "AmarBazar",
  tagline: "Fresh groceries, delivered across Qatar",
  logo_url: null,
  favicon_url: null,
  contact_phone: "",
  whatsapp_number: "",
  contact_email: "",
  address: "",
  currency: "QAR",
  currency_symbol: "QAR",
  tax_rate: 0,
  free_shipping_over: 200,
  default_shipping_fee: 15,
  bank_name: null,
  bank_account_name: null,
  bank_account_number: null,
  bank_iban: null,
  announcement: "Free delivery on orders over QAR 200 — order before 6pm for same-day dispatch",
  social_links: {},
  homepage_sections: {},
  updated_at: new Date().toISOString(),
} satisfies WebsiteSettings;

export const getSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<WebsiteSettings> => {
    const { data } = await publicClient().from("website_settings").select("*").eq("id", 1).maybeSingle();
    return (data as WebsiteSettings) ?? DEFAULT_SETTINGS;
  },
);

export const searchSuggestions = createServerFn({ method: "GET" })
  .inputValidator((input: { term: string }) => input)
  .handler(async ({ data }) => {
    const term = data.term.trim();
    if (term.length < 2) return [];
    const { data: rows } = await publicClient()
      .from("products")
      .select("id, name, slug, image_url, price")
      .eq("is_active", true)
      .ilike("name", `%${term.replace(/[,()]/g, " ")}%`)
      .limit(8);
    return (rows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      image_url: row.image_url,
      price: num(row.price),
    }));
  });

export const listReviews = createServerFn({ method: "GET" })
  .inputValidator((input: { productId: string }) => input)
  .handler(async ({ data }): Promise<Review[]> => {
    const { data: rows } = await publicClient()
      .from("reviews")
      .select("*")
      .eq("product_id", data.productId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false });
    return (rows ?? []) as Review[];
  });

export type CouponResult = {
  code: string;
  kind: string;
  value: number;
  discount: number;
  free_shipping: boolean;
};

export const validateCoupon = createServerFn({ method: "GET" })
  .inputValidator((input: { code: string; subtotal: number }) => input)
  .handler(async ({ data }): Promise<CouponResult | null> => {
    const code = data.code.trim();
    if (!code) return null;
    const { data: rows, error } = await publicClient().rpc("validate_coupon", {
      _code: code,
      _subtotal: Math.max(0, data.subtotal),
    });
    if (error || !rows || rows.length === 0) return null;
    const row = rows[0];
    if (!row) return null;
    return {
      code: row.code,
      kind: row.kind,
      value: num(row.value),
      discount: num(row.discount),
      free_shipping: row.free_shipping,
    };
  });

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false as const, message: "Please enter a valid email address." };
    }
    const sb = publicClient();
    const { error } = await sb.from("newsletter_subscribers").insert({ email });
    if (error && error.code !== "23505") {
      return { ok: false as const, message: "Could not save your email. Please try again." };
    }
    return { ok: true as const, message: "You're on the list — welcome to AmarBazar." };
  });

export type TrackedOrder = {
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  customer_name: string;
  phone: string;
  city: string | null;
  area: string | null;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  created_at: string;
  items: Array<{
    name: string;
    qty: number;
    unit_price: number;
    line_total: number;
    image_url: string | null;
    unit_label: string | null;
  }>;
  events: Array<{ status: string; note: string | null; created_at: string }>;
};

export const trackOrder = createServerFn({ method: "GET" })
  .inputValidator((input: { orderNumber: string; phone: string }) => input)
  .handler(async ({ data }): Promise<TrackedOrder | null> => {
    const { data: result, error } = await publicClient().rpc("track_order", {
      _order_number: data.orderNumber.trim(),
      _phone: data.phone.trim(),
    });
    if (error || !result) return null;
    const raw = result as unknown as Record<string, unknown>;
    return {
      order_number: String(raw["order_number"] ?? ""),
      status: String(raw["status"] ?? "pending"),
      payment_method: String(raw["payment_method"] ?? "cod"),
      payment_status: String(raw["payment_status"] ?? "unpaid"),
      customer_name: String(raw["customer_name"] ?? ""),
      phone: String(raw["phone"] ?? ""),
      city: raw["city"] == null ? null : String(raw["city"]),
      area: raw["area"] == null ? null : String(raw["area"]),
      subtotal: num(raw["subtotal"] as string | number | null),
      discount: num(raw["discount"] as string | number | null),
      shipping_fee: num(raw["shipping_fee"] as string | number | null),
      total: num(raw["total"] as string | number | null),
      created_at: String(raw["created_at"] ?? ""),
      items: Array.isArray(raw["items"]) ? (raw["items"] as TrackedOrder["items"]) : [],
      events: Array.isArray(raw["events"]) ? (raw["events"] as TrackedOrder["events"]) : [],
    };
  });

/** Public catalogue statistics used by the homepage service strip. */
export const getCatalogueStats = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [products, categories, brands] = await Promise.all([
    sb.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    sb.from("categories").select("id", { count: "exact", head: true }).eq("is_active", true),
    sb.from("brands").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);
  return {
    products: products.count ?? 0,
    categories: categories.count ?? 0,
    brands: brands.count ?? 0,
  };
});

export type { Coupon, Order, OrderEvent, OrderItem };
