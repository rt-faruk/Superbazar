import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { loadCart, saveCart } from "@/lib/cart.functions";

export type CartItem = {
  product_id: string;
  variant_id?: string | null;
  qty: number;
};

const STORAGE_KEY = "amarbazar.cart.v1";

type CartContextValue = {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (item: CartItem) => void;
  setQty: (product_id: string, variant_id: string | null | undefined, qty: number) => void;
  remove: (product_id: string, variant_id?: string | null) => void;
  clear: () => void;
  isSaved: (product_id: string) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

function lineKey(item: CartItem): string {
  return `${item.product_id}::${item.variant_id ?? ""}`;
}

function readLocal(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is CartItem => {
        const item = row as CartItem;
        return typeof item?.product_id === "string" && typeof item?.qty === "number";
      })
      .map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        qty: Math.max(1, Math.min(50, Math.trunc(item.qty))),
      }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const mergedFor = useRef<string | null>(null);
  const pushTimer = useRef<number | null>(null);
  const pushCart = useServerFn(saveCart);
  const fetchCart = useServerFn(loadCart);

  useEffect(() => {
    setItems(readLocal());
    setReady(true);
  }, []);

  // Keep the browser copy, and the account copy when signed in, in step with the screen.
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Private mode or a full quota: the basket still works for this visit.
    }

    if (pushTimer.current) window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      try {
        await pushCart({ data: { items } });
      } catch {
        // The browser copy is the source of truth; the account copy catches up later.
      }
    }, 900);

    return () => {
      if (pushTimer.current) window.clearTimeout(pushTimer.current);
    };
  }, [items, ready, pushCart]);

  // When someone signs in, bring their saved basket in and keep whatever is only on this device.
  useEffect(() => {
    let cancelled = false;

    async function merge(userId: string) {
      if (mergedFor.current === userId) return;
      mergedFor.current = userId;
      try {
        const saved = await fetchCart({ data: undefined });
        if (cancelled || !saved || saved.length === 0) return;
        setItems((current) => {
          const byLine = new Map(current.map((item) => [lineKey(item), item]));
          for (const line of saved) {
            const key = lineKey(line);
            const existing = byLine.get(key);
            byLine.set(key, {
              product_id: line.product_id,
              variant_id: line.variant_id ?? null,
              qty: Math.max(existing?.qty ?? 0, line.qty),
            });
          }
          return [...byLine.values()];
        });
      } catch {
        mergedFor.current = null;
      }
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") mergedFor.current = null;
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        void merge(session.user.id);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, [fetchCart]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.qty, 0),
      ready,
      add: (item) =>
        setItems((current) => {
          const key = lineKey(item);
          const existing = current.find((row) => lineKey(row) === key);
          if (existing) {
            return current.map((row) =>
              lineKey(row) === key
                ? { ...row, qty: Math.max(1, Math.min(50, row.qty + item.qty)) }
                : row,
            );
          }
          return [...current, { ...item, qty: Math.max(1, Math.min(50, item.qty)) }];
        }),
      setQty: (product_id, variant_id, qty) =>
        setItems((current) => {
          const key = `${product_id}::${variant_id ?? ""}`;
          if (qty <= 0) return current.filter((row) => lineKey(row) !== key);
          return current.map((row) =>
            lineKey(row) === key ? { ...row, qty: Math.max(1, Math.min(50, qty)) } : row,
          );
        }),
      remove: (product_id, variant_id) =>
        setItems((current) => {
          const key = `${product_id}::${variant_id ?? ""}`;
          return current.filter((row) => lineKey(row) !== key);
        }),
      clear: () => setItems([]),
      isSaved: (product_id) => items.some((item) => item.product_id === product_id),
    }),
    [items, ready],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
