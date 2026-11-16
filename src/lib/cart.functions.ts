import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { CartLine } from "./checkout.functions";

/** The signed-in shopper's saved basket. */
export const loadCart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CartLine[]> => {
    const cart = await context.supabase
      .from("carts")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!cart.data) return [];
    const items = await context.supabase
      .from("cart_items")
      .select("product_id, variant_id, qty")
      .eq("cart_id", cart.data.id)
      .order("created_at", { ascending: true });
    return (items.data ?? []).map((row) => ({
      product_id: row.product_id,
      variant_id: row.variant_id ?? null,
      qty: row.qty,
    }));
  });

/** Replace the signed-in shopper's saved basket with what is on their screen. */
export const saveCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { items: CartLine[] }) => input)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const existing = await sb
      .from("carts")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();

    let cartId = existing.data?.id;
    if (!cartId) {
      const created = await sb
        .from("carts")
        .insert({ user_id: context.userId })
        .select("id")
        .single();
      if (created.error || !created.data) {
        throw created.error ?? new Error("Could not open a basket for this account.");
      }
      cartId = created.data.id;
    }

    await sb.from("cart_items").delete().eq("cart_id", cartId);

    const rows = data.items
      .filter((line) => line.product_id)
      .map((line) => ({
        cart_id: cartId as string,
        product_id: line.product_id,
        variant_id: line.variant_id ?? null,
        qty: Math.max(1, Math.min(50, Math.trunc(line.qty || 1))),
      }));

    if (rows.length > 0) {
      const inserted = await sb.from("cart_items").insert(rows);
      if (inserted.error) throw inserted.error;
    }
    return { ok: true };
  });
