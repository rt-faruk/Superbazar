import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { publicClient } from "./public-client";
import { effectivePrice, listPrice } from "./product";
import type { CartLine as CartView } from "./types";

type CartKey = { product_id: string; variant_id?: string | null; qty: number };

/** Live product details for the lines in a basket (prices and stock come from the database). */
export const getCartView = createServerFn({ method: "POST" })
  .inputValidator((input: { items: CartKey[] }) => ({
    items: (input?.items ?? []).slice(0, 100),
  }))
  .handler(async ({ data }): Promise<CartView[]> => {
    const ids = [...new Set(data.items.map((line) => line.product_id))];
    if (ids.length === 0) return [];
    const sb = publicClient();
    const variantIds = data.items.map((line) => line.variant_id).filter((id): id is string => Boolean(id));
    const [products, variants] = await Promise.all([
      sb
        .from("products")
        .select(
          "id, slug, name, image_url, unit_label, price, compare_at_price, flash_sale_price, flash_sale_ends_at, is_flash_sale, stock_quantity",
        )
        .in("id", ids)
        .eq("is_active", true),
      variantIds.length
        ? sb.from("product_variants").select("id, product_id, name, price, stock_quantity").in("id", variantIds)
        : Promise.resolve({ data: [] as Array<{ id: string; product_id: string; name: string; price: number; stock_quantity: number }> }),
    ]);

    const byId = new Map((products.data ?? []).map((row) => [row.id, row]));
    const variantById = new Map((variants.data ?? []).map((row) => [row.id, row]));

    const lines: CartView[] = [];
    for (const line of data.items) {
      const product = byId.get(line.product_id);
      if (!product) continue;
      const variant = line.variant_id ? variantById.get(line.variant_id) : undefined;
      if (line.variant_id && !variant) continue;
      const priced = {
        price: Number(product.price),
        compare_at_price: product.compare_at_price == null ? null : Number(product.compare_at_price),
        flash_sale_price: product.flash_sale_price == null ? null : Number(product.flash_sale_price),
        flash_sale_ends_at: product.flash_sale_ends_at,
        is_flash_sale: product.is_flash_sale,
      };
      const unit = variant ? Number(variant.price) : effectivePrice(priced);
      const was = variant ? null : listPrice(priced);
      lines.push({
        product_id: product.id,
        variant_id: variant?.id ?? null,
        slug: product.slug,
        name: product.name,
        image_url: product.image_url ?? "",
        unit_label: variant?.name ?? product.unit_label,
        unit_price: unit,
        compare_at_price: was && was > unit ? was : null,
        qty: line.qty,
        stock: variant ? variant.stock_quantity : product.stock_quantity,
      });
    }
    return lines;
  });

/** The product ids the signed-in shopper has saved. */
export const myWishlistIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const { data } = await context.supabase
      .from("wishlist_items")
      .select("product_id")
      .eq("user_id", context.userId);
    return (data ?? []).map((row) => row.product_id);
  });
