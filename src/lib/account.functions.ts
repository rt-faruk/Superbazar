import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export type AddressRow = {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  country: string;
  city: string;
  area: string | null;
  street: string | null;
  building_number: string | null;
  apartment_number: string | null;
  delivery_instructions: string | null;
  is_default: boolean;
  created_at: string;
};

export type WishlistRow = {
  product_id: string;
  created_at: string;
  name: string;
  slug: string;
  image_url: string | null;
  price: number;
};

export type MyOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total: number;
  created_at: string;
  city: string | null;
  item_count: number;
  items: Array<{ name: string; qty: number; unit_label: string | null }>;
};

async function isAdminCheck(sb: SupabaseClient<Database>) {
  const { data } = await sb.rpc("is_admin");
  return data === true;
}

export const getAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, admin, addresses, wishlist] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      isAdminCheck(context.supabase),
      context.supabase
        .from("addresses")
        .select("*")
        .eq("user_id", context.userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false }),
      context.supabase
        .from("wishlist_items")
        .select("product_id, created_at, products(name, slug, image_url, price)")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false }),
    ]);

    return {
      profile: (profile.data ?? null) as ProfileRow | null,
      isAdmin: admin,
      addresses: (addresses.data ?? []) as AddressRow[],
      wishlist: ((wishlist.data ?? []) as unknown as Array<
        WishlistRow & { products: { name: string; slug: string; image_url: string | null; price: number } | null }
      >).map((row) => ({
        product_id: row.product_id,
        created_at: row.created_at,
        name: row.products?.name ?? "Item",
        slug: row.products?.slug ?? "",
        image_url: row.products?.image_url ?? null,
        price: Number(row.products?.price ?? 0),
      })),
    };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { full_name?: string; phone?: string; avatar_url?: string | null }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.full_name?.trim() || null,
        phone: data.phone?.trim() || null,
        avatar_url: data.avatar_url ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const saveAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      label?: string;
      full_name: string;
      phone: string;
      city: string;
      area?: string;
      street?: string;
      building_number?: string;
      apartment_number?: string;
      delivery_instructions?: string;
      is_default?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const payload = {
      label: data.label?.trim() || "Home",
      full_name: data.full_name.trim(),
      phone: data.phone.trim(),
      city: data.city.trim(),
      area: data.area?.trim() || null,
      street: data.street?.trim() || null,
      building_number: data.building_number?.trim() || null,
      apartment_number: data.apartment_number?.trim() || null,
      delivery_instructions: data.delivery_instructions?.trim() || null,
      is_default: data.is_default ?? false,
    };
    if (!payload.full_name || !payload.phone || !payload.city) {
      return { ok: false as const, message: "Name, phone and city are required." };
    }

    if (payload.is_default) {
      await sb.from("addresses").update({ is_default: false }).eq("user_id", context.userId);
    }

    if (data.id) {
      const { error } = await sb
        .from("addresses")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", context.userId);
      if (error) return { ok: false as const, message: "Could not save this address." };
      return { ok: true as const, id: data.id };
    }

    const { data: created, error } = await sb
      .from("addresses")
      .insert({ ...payload, user_id: context.userId })
      .select("id")
      .single();
    if (error || !created) return { ok: false as const, message: "Could not save this address." };
    return { ok: true as const, id: created.id };
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("addresses")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const setDefaultAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await sb.from("addresses").update({ is_default: false }).eq("user_id", context.userId);
    const { error } = await sb
      .from("addresses")
      .update({ is_default: true })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const toggleWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string }) => input)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const existing = await sb
      .from("wishlist_items")
      .select("id")
      .eq("user_id", context.userId)
      .eq("product_id", data.productId)
      .maybeSingle();

    if (existing.data) {
      const { error } = await sb.from("wishlist_items").delete().eq("id", existing.data.id);
      if (error) throw error;
      return { saved: false };
    }

    const { error } = await sb
      .from("wishlist_items")
      .insert({ user_id: context.userId, product_id: data.productId });
    if (error && error.code !== "23505") throw error;
    return { saved: true };
  });

export const myOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyOrder[]> => {
    const { data } = await context.supabase
      .from("orders")
      .select("id, order_number, status, payment_method, payment_status, total, created_at, city, order_items(name, qty, unit_label)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    return ((data ?? []) as unknown as Array<
      Omit<MyOrder, "item_count" | "items"> & {
        order_items: Array<{ name: string; qty: number; unit_label: string | null }>;
      }
    >).map((row) => ({
      id: row.id,
      order_number: row.order_number,
      status: row.status,
      payment_method: row.payment_method,
      payment_status: row.payment_status,
      total: Number(row.total),
      created_at: row.created_at,
      city: row.city,
      items: row.order_items ?? [],
      item_count: (row.order_items ?? []).reduce((sum, item) => sum + item.qty, 0),
    }));
  });

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { productId: string; rating: number; title?: string; body?: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const rating = Math.max(1, Math.min(5, Math.round(data.rating)));
    const title = data.title?.trim() ?? "";
    const body = data.body?.trim() ?? "";
    if (!title && !body) {
      return { ok: false as const, message: "Please write a few words about the item." };
    }
    const { error } = await context.supabase.from("reviews").insert({
      product_id: data.productId,
      user_id: context.userId,
      rating,
      title: title || null,
      body: body || null,
      is_approved: false,
    });
    if (error) {
      return { ok: false as const, message: "Could not send your review. Please try again." };
    }
    return { ok: true as const, message: "Thanks! Your review will appear once it is approved." };
  });
