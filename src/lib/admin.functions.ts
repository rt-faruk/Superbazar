import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type OrderStatusValue = Database["public"]["Enums"]["order_status"];

const SIMPLE_TABLES = ["categories", "brands", "banners", "coupons"] as const;
type SimpleTableName = (typeof SIMPLE_TABLES)[number];
function assertSimpleTable<T extends { table: string }>(input: T): T & { table: SimpleTableName } {
  if (!SIMPLE_TABLES.includes(input.table as SimpleTableName)) throw new Error("Unknown list.");
  return input as T & { table: SimpleTableName };
}

/** Every admin action re-checks the role in the database before touching anything. */
async function requireAdmin(sb: SupabaseClient<Database>) {
  const { data } = await sb.rpc("is_admin");
  if (data !== true) throw new Error("You do not have access to the admin area.");
}

export type AdminOrderRow = {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  customer_name: string;
  phone: string;
  city: string | null;
  total: number;
  created_at: string;
  item_count: number;
};

export type AdminStats = {
  revenue: number;
  orders: number;
  pending_orders: number;
  customers: number;
  products: number;
  low_stock: number;
  out_of_stock: number;
  pending_reviews: number;
  subscribers: number;
  by_status: Record<string, number>;
};

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStats> => {
    await requireAdmin(context.supabase);
    const sb = context.supabase;

    const [orders, products, reviews, subscribers, customers] = await Promise.all([
      sb.from("orders").select("status, total, payment_status"),
      sb.from("products").select("stock_quantity, is_active"),
      sb.from("reviews").select("id", { count: "exact", head: true }).eq("is_approved", false),
      sb.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
      sb.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    const rows = (orders.data ?? []) as Array<{
      status: string;
      total: number;
      payment_status: string;
    }>;
    const by_status: Record<string, number> = {};
    for (const row of rows) by_status[row.status] = (by_status[row.status] ?? 0) + 1;

    const stock = (products.data ?? []) as Array<{ stock_quantity: number; is_active: boolean }>;

    return {
      revenue: rows
        .filter((row) => row.status !== "cancelled")
        .reduce((sum, row) => sum + Number(row.total), 0),
      orders: rows.length,
      pending_orders: rows.filter((row) => row.status === "pending").length,
      customers: customers.count ?? 0,
      products: stock.length,
      low_stock: stock.filter((row) => row.stock_quantity > 0 && row.stock_quantity <= 10).length,
      out_of_stock: stock.filter((row) => row.stock_quantity <= 0).length,
      pending_reviews: reviews.count ?? 0,
      subscribers: subscribers.count ?? 0,
      by_status,
    };
  });

export const adminOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string | undefined; search?: string | undefined } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<AdminOrderRow[]> => {
    await requireAdmin(context.supabase);
    let query = context.supabase
      .from("orders")
      .select("id, order_number, status, payment_method, payment_status, customer_name, phone, city, total, created_at, order_items(qty)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (data.status) query = query.eq("status", data.status as OrderStatusValue);
    if (data.search) {
      const term = `%${data.search.trim().replace(/[,()]/g, " ")}%`;
      query = query.or(`order_number.ilike.${term},customer_name.ilike.${term},phone.ilike.${term}`);
    }

    const { data: rows } = await query;
    return ((rows ?? []) as unknown as Array<
      Omit<AdminOrderRow, "item_count"> & { order_items: Array<{ qty: number }> }
    >).map((row) => ({
      id: row.id,
      order_number: row.order_number,
      status: row.status,
      payment_method: row.payment_method,
      payment_status: row.payment_status,
      customer_name: row.customer_name,
      phone: row.phone,
      city: row.city,
      total: Number(row.total),
      created_at: row.created_at,
      item_count: (row.order_items ?? []).reduce((sum, item) => sum + item.qty, 0),
    }));
  });

export type AdminOrderDetail = {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  customer_name: string;
  phone: string;
  email: string | null;
  city: string;
  area: string | null;
  street: string | null;
  building_number: string | null;
  apartment_number: string | null;
  delivery_instructions: string | null;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  tax: number;
  total: number;
  coupon_code: string | null;
  created_at: string;
  items: Array<{
    name: string;
    qty: number;
    unit_price: number;
    line_total: number;
    unit_label: string | null;
    image_url: string | null;
  }>;
  events: Array<{ status: string; note: string | null; created_at: string }>;
  payments: Array<{ provider: string; amount: number; status: string; created_at: string }>;
};

export const adminOrderDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<AdminOrderDetail | null> => {
    await requireAdmin(context.supabase);
    const { data: row } = await context.supabase
      .from("orders")
      .select("*, order_items(*), order_events(*), payment_transactions(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return null;
    const raw = row as unknown as Omit<AdminOrderDetail, "items" | "events" | "payments"> & {
      order_items: AdminOrderDetail["items"] | null;
      order_events: AdminOrderDetail["events"] | null;
      payment_transactions: AdminOrderDetail["payments"] | null;
    };
    const { order_items, order_events, payment_transactions, ...order } = raw;
    return {
      ...order,
      items: order_items ?? [],
      events: order_events ?? [],
      payments: payment_transactions ?? [],
    };
  });

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string; note?: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase);
    const sb = context.supabase;
    const allowed = [
      "pending",
      "confirmed",
      "processing",
      "packed",
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];
    if (!allowed.includes(data.status)) return { ok: false as const, message: "Unknown status." };

    const { error } = await sb
      .from("orders")
      .update({
        status: data.status as OrderStatusValue,
        ...(data.status === "delivered" ? { payment_status: "paid" } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) return { ok: false as const, message: "Could not update this order." };

    await sb.from("order_events").insert({
      order_id: data.id,
      status: data.status as OrderStatusValue,
      note: data.note?.trim() || null,
    });
    return { ok: true as const };
  });

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  is_flash_sale: boolean;
  category_name: string | null;
  brand_name: string | null;
  image_url: string | null;
};

export const adminProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string | undefined; categorySlug?: string | undefined } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<AdminProductRow[]> => {
    await requireAdmin(context.supabase);
    let query = context.supabase
      .from("products")
      .select("id, name, slug, sku, price, compare_at_price, stock_quantity, is_active, is_featured, is_flash_sale, image_url, categories(name), brands(name)")
      .order("created_at", { ascending: false })
      .limit(300);

    if (data.search) {
      const term = `%${data.search.trim().replace(/[,()]/g, " ")}%`;
      query = query.or(`name.ilike.${term},sku.ilike.${term}`);
    }

    const { data: rows } = await query;
    return ((rows ?? []) as unknown as Array<
      Omit<AdminProductRow, "category_name" | "brand_name"> & {
        categories: { name: string } | null;
        brands: { name: string } | null;
      }
    >).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      price: Number(row.price),
      compare_at_price: row.compare_at_price == null ? null : Number(row.compare_at_price),
      stock_quantity: row.stock_quantity,
      is_active: row.is_active,
      is_featured: row.is_featured,
      is_flash_sale: row.is_flash_sale,
      image_url: row.image_url,
      category_name: row.categories?.name ?? null,
      brand_name: row.brands?.name ?? null,
    }));
  });

export type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  category_id?: string | null;
  brand_id?: string | null;
  sku?: string;
  unit_label?: string;
  price: number;
  compare_at_price?: number | null;
  stock_quantity: number;
  low_stock_threshold?: number;
  is_active?: boolean;
  is_featured?: boolean;
  is_flash_sale?: boolean;
  flash_sale_price?: number | null;
  flash_sale_ends_at?: string | null;
  is_organic?: boolean;
  ingredients?: string;
  tags?: string[];
  image_url?: string | null;
  images?: Array<{ url: string; alt?: string | null }>;
};

export const adminSaveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ProductForm) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase);
    const sb = context.supabase;

    const name = data.name.trim();
    const slug = (data.slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    if (!name || !slug) return { ok: false as const, message: "Name and link are required." };
    if (!(Number(data.price) > 0)) return { ok: false as const, message: "Price must be above zero." };

    const payload = {
      name,
      slug,
      short_description: data.short_description?.trim() || null,
      description: data.description?.trim() || null,
      category_id: data.category_id || null,
      brand_id: data.brand_id || null,
      sku: data.sku?.trim() || null,
      unit_label: data.unit_label?.trim() || null,
      price: Number(data.price),
      compare_at_price: data.compare_at_price == null ? null : Number(data.compare_at_price),
      stock_quantity: Math.max(0, Math.trunc(Number(data.stock_quantity) || 0)),
      low_stock_threshold: Math.max(0, Math.trunc(Number(data.low_stock_threshold ?? 10))),
      is_active: data.is_active ?? true,
      is_featured: data.is_featured ?? false,
      is_flash_sale: data.is_flash_sale ?? false,
      flash_sale_price: data.flash_sale_price == null ? null : Number(data.flash_sale_price),
      flash_sale_ends_at: data.flash_sale_ends_at || null,
      is_organic: data.is_organic ?? false,
      ingredients: data.ingredients?.trim() || null,
      tags: data.tags ?? [],
      image_url: data.image_url?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let productId = data.id;
    if (productId) {
      const { error } = await sb.from("products").update(payload).eq("id", productId);
      if (error) return { ok: false as const, message: "Could not save this product." };
    } else {
      const { data: created, error } = await sb
        .from("products")
        .insert(payload)
        .select("id")
        .single();
      if (error || !created) return { ok: false as const, message: "Could not create this product." };
      productId = created.id;
    }

    if (data.images) {
      await sb.from("product_images").delete().eq("product_id", productId);
      const rows = data.images
        .filter((image) => image.url.trim())
        .map((image, index) => ({
          product_id: productId as string,
          url: image.url.trim(),
          alt: image.alt?.trim() || null,
          sort_order: index,
        }));
      if (rows.length > 0) await sb.from("product_images").insert(rows);
    }

    return { ok: true as const, id: productId };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase);
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) return { ok: false as const, message: "Could not delete this product." };
    return { ok: true as const };
  });

export const adminLookup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase);
    const [categories, brands, shipping] = await Promise.all([
      context.supabase.from("categories").select("id, name, slug, parent_id").order("sort_order"),
      context.supabase.from("brands").select("id, name, slug").order("sort_order"),
      context.supabase.from("shipping_methods").select("id, name, fee, free_over").order("sort_order"),
    ]);
    return {
      categories: categories.data ?? [],
      brands: brands.data ?? [],
      shipping: shipping.data ?? [],
    };
  });

export const adminReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pendingOnly?: boolean } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase);
    let query = context.supabase
      .from("reviews")
      .select("*, products(name, slug)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.pendingOnly) query = query.eq("is_approved", false);
    const { data: rows } = await query;
    return rows ?? [];
  });

export const adminSetReviewApproved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; approved: boolean }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase);
    const sb = context.supabase;
    const { data: review, error } = await sb
      .from("reviews")
      .update({ is_approved: data.approved })
      .eq("id", data.id)
      .select("product_id")
      .maybeSingle();
    if (error) return { ok: false as const, message: "Could not update this review." };
    if (review) await sb.rpc("refresh_product_rating", { _product_id: review.product_id });
    return { ok: true as const };
  });

export const adminSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase);
    const { data } = await context.supabase.from("website_settings").select("*").eq("id", 1).maybeSingle();
    return data;
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, unknown>) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase);
    const { error } = await context.supabase
      .from("website_settings")
      .update({ ...data, id: 1, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) return { ok: false as const, message: "Could not save the store settings." };
    return { ok: true as const };
  });

export const adminSimpleList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { table: SimpleTableName }) => assertSimpleTable(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase);
    const { data: rows } = await context.supabase
      .from(data.table)
      .select("*")
      .order("created_at", { ascending: false });
    return rows ?? [];
  });

export const adminSimpleSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { table: SimpleTableName; id?: string | undefined; values: Record<string, unknown> }) => {
      const { id: _ignored, ...values } = input.values ?? {};
      return { ...assertSimpleTable(input), values };
    },
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase);
    const sb = context.supabase;
    if (data.id) {
      const { error } = await sb.from(data.table).update(data.values as never).eq("id", data.id);
      if (error) return { ok: false as const, message: "Could not save this entry." };
      return { ok: true as const, id: data.id };
    }
    const { data: created, error } = await sb.from(data.table).insert(data.values as never).select("id").single();
    if (error || !created) return { ok: false as const, message: "Could not create this entry." };
    return { ok: true as const, id: created.id };
  });

export const adminSimpleDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { table: SimpleTableName; id: string }) => assertSimpleTable(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase);
    const { error } = await context.supabase.from(data.table).delete().eq("id", data.id);
    if (error) return { ok: false as const, message: "Could not delete this entry." };
    return { ok: true as const };
  });

export const adminNewsletter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase);
    const { data } = await context.supabase
      .from("newsletter_subscribers")
      .select("email, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    return data ?? [];
  });

export type AdminProductDetail = {
  product: Database["public"]["Tables"]["products"]["Row"];
  images: Array<{ url: string; alt: string | null }>;
};

export const adminProductDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<AdminProductDetail | null> => {
    await requireAdmin(context.supabase);
    const [product, images] = await Promise.all([
      context.supabase.from("products").select("*").eq("id", data.id).maybeSingle(),
      context.supabase
        .from("product_images")
        .select("url, alt, sort_order")
        .eq("product_id", data.id)
        .order("sort_order", { ascending: true }),
    ]);
    if (!product.data) return null;
    return {
      product: product.data,
      images: (images.data ?? []).map((row) => ({ url: row.url, alt: row.alt })),
    };
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase);
    const sb = context.supabase;
    const { data: review } = await sb.from("reviews").select("product_id").eq("id", data.id).maybeSingle();
    const { error } = await sb.from("reviews").delete().eq("id", data.id);
    if (error) return { ok: false as const, message: "Could not delete this review." };
    if (review) await sb.rpc("refresh_product_rating", { _product_id: review.product_id });
    return { ok: true as const };
  });
