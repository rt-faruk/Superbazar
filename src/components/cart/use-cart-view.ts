import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getCartView } from "@/lib/storefront.functions";

import { useCart } from "./cart-provider";

/** The basket lines with live names, photos, prices and stock. */
export function useCartView() {
  const cart = useCart();
  const fetchView = useServerFn(getCartView);
  const key = cart.items.map((i) => `${i.product_id}:${i.variant_id ?? ""}:${i.qty}`).join("|");
  const query = useQuery({
    queryKey: ["cart-view", key],
    queryFn: () => fetchView({ data: { items: cart.items } }),
    enabled: cart.ready && cart.items.length > 0,
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });
  const lines = cart.items.length === 0 ? [] : (query.data ?? []);
  const subtotal = lines.reduce((sum, line) => sum + line.unit_price * line.qty, 0);
  const savings = lines.reduce(
    (sum, line) => sum + (line.compare_at_price ? (line.compare_at_price - line.unit_price) * line.qty : 0),
    0,
  );
  return {
    ...cart,
    lines,
    subtotal,
    savings,
    loading: !cart.ready || (cart.items.length > 0 && query.isLoading),
  };
}
