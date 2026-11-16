import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Brand = Database["public"]["Tables"]["brands"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
export type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Banner = Database["public"]["Tables"]["banners"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderEvent = Database["public"]["Tables"]["order_events"]["Row"];
export type Address = Database["public"]["Tables"]["addresses"]["Row"];
export type Coupon = Database["public"]["Tables"]["coupons"]["Row"];
export type ShippingMethod = Database["public"]["Tables"]["shipping_methods"]["Row"];
export type WebsiteSettings = Database["public"]["Tables"]["website_settings"]["Row"];

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cod" | "card" | "bank_transfer";
export type PaymentStatus = "unpaid" | "paid" | "refunded" | "failed";

/** A product joined with the fields the storefront cards need. */
export type ProductCard = Product & {
  category_name: string | null;
  category_slug: string | null;
  brand_name: string | null;
  image_urls: string[];
};

export type CartLine = {
  product_id: string;
  variant_id: string | null;
  slug: string;
  name: string;
  image_url: string;
  unit_label: string | null;
  unit_price: number;
  compare_at_price: number | null;
  qty: number;
  stock: number;
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];
