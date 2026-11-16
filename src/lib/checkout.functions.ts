import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import type { Json } from "@/integrations/supabase/types";

import { publicClient } from "./public-client";

export type CartLine = {
  product_id: string;
  variant_id?: string | null;
  qty: number;
};

export type CheckoutCustomer = {
  name: string;
  phone: string;
  email?: string;
  city: string;
  area?: string;
  street?: string;
  building_number?: string;
  apartment_number?: string;
  delivery_instructions?: string;
};

export type CheckoutInput = {
  items: CartLine[];
  customer: CheckoutCustomer;
  shipping_method_id?: string | null;
  coupon_code?: string | null;
};

export type PlacedOrder = {
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
  tax: number;
  total: number;
  coupon_code: string | null;
  shipping_method: string;
  delivery_days: { min: number; max: number };
  created_at: string;
  items: Array<{
    name: string;
    qty: number;
    unit_price: number;
    line_total: number;
    image_url: string | null;
    unit_label: string | null;
  }>;
};

export type PlaceOrderResult = { ok: true; order: PlacedOrder } | { ok: false; message: string };

const ERROR_MESSAGES: Record<string, string> = {
  EMPTY_CART: "Your basket is empty.",
  MISSING_CUSTOMER_FIELDS: "Please add your name, phone number and city.",
  BAD_QUANTITY: "One of the quantities is not allowed. Please adjust it.",
  PRODUCT_UNAVAILABLE: "One of the items is no longer available.",
  VARIANT_UNAVAILABLE: "One of the chosen sizes is no longer available.",
  OUT_OF_STOCK: "Sorry, one of the items has just run out of stock.",
  BAD_COUPON: "That discount code cannot be used on this basket.",
  NO_SHIPPING_METHOD: "No delivery option is available right now.",
  STORE_NOT_CONFIGURED: "The store is not ready to take orders yet.",
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** A signed-in shopper's verified token, so their order shows under "My orders". */
async function shopperToken(): Promise<string | undefined> {
  const header = getRequest()?.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return undefined;
  const token = header.slice(7);
  if (token.split(".").length !== 3) return undefined;
  const { data, error } = await publicClient().auth.getClaims(token);
  if (error || !data?.claims?.sub) return undefined;
  return token;
}

/** Cash on delivery checkout. Guests are allowed; prices and stock are re-checked in the database. */
export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: CheckoutInput) => input)
  .handler(async ({ data }): Promise<PlaceOrderResult> => {
    const sb = publicClient(await shopperToken());
    const { data: result, error } = await sb.rpc("place_cod_order", {
      _payload: {
        items: data.items.map((line) => ({
          product_id: line.product_id,
          variant_id: line.variant_id ?? null,
          qty: Math.max(1, Math.min(50, Math.trunc(line.qty))),
        })),
        customer: data.customer,
        shipping_method_id: data.shipping_method_id ?? null,
        coupon_code: data.coupon_code ?? null,
      } as unknown as Json,
    });

    if (error || !result) {
      const known = ERROR_MESSAGES[(error?.message ?? "").trim()];
      return {
        ok: false,
        message: known ?? "We could not place the order. Please try again.",
      };
    }

    const raw = result as unknown as Record<string, unknown>;
    const days = (raw["delivery_days"] ?? {}) as Record<string, unknown>;
    return {
      ok: true,
      order: {
        order_number: String(raw["order_number"] ?? ""),
        status: String(raw["status"] ?? "pending"),
        payment_method: String(raw["payment_method"] ?? "cod"),
        payment_status: String(raw["payment_status"] ?? "unpaid"),
        customer_name: String(raw["customer_name"] ?? ""),
        phone: String(raw["phone"] ?? ""),
        city: raw["city"] == null ? null : String(raw["city"]),
        area: raw["area"] == null ? null : String(raw["area"]),
        subtotal: toNumber(raw["subtotal"]),
        discount: toNumber(raw["discount"]),
        shipping_fee: toNumber(raw["shipping_fee"]),
        tax: toNumber(raw["tax"]),
        total: toNumber(raw["total"]),
        coupon_code: raw["coupon_code"] == null ? null : String(raw["coupon_code"]),
        shipping_method: String(raw["shipping_method"] ?? ""),
        delivery_days: { min: toNumber(days["min"]), max: toNumber(days["max"]) },
        created_at: String(raw["created_at"] ?? ""),
        items: Array.isArray(raw["items"])
          ? (raw["items"] as PlacedOrder["items"]).map((item) => ({
              name: String(item.name ?? ""),
              qty: toNumber(item.qty),
              unit_price: toNumber(item.unit_price),
              line_total: toNumber(item.line_total),
              image_url: item.image_url == null ? null : String(item.image_url),
              unit_label: item.unit_label == null ? null : String(item.unit_label),
            }))
          : [],
      },
    };
  });
