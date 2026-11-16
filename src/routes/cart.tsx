import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";

import { useCartView } from "@/components/cart/use-cart-view";
import { PageHeader } from "@/components/layout/page-header";
import { useSiteData } from "@/components/layout/site-data";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your basket | AmarBazar" },
      { name: "description", content: "Review the items in your AmarBazar basket before checkout." },
      { property: "og:title", content: "Your basket | AmarBazar" },
      { property: "og:description", content: "Review your basket and check out with cash on delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { settings } = useSiteData();
  const { lines, subtotal, savings, loading, setQty, remove, items } = useCartView();
  const freeOver = Number(settings.free_shipping_over);
  const remaining = Math.max(0, freeOver - subtotal);

  return (
    <>
      <PageHeader title="Your basket" crumbs={[{ label: "Basket" }]} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <p className="py-16 text-center text-muted-foreground">Loading your basket…</p>
        ) : items.length === 0 || lines.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-secondary text-primary">
              <ShoppingBag className="size-7" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold">Your basket is empty</h2>
            <p className="mt-2 text-muted-foreground">Fill it with honey, dates, spices and more.</p>
            <Button asChild className="mt-6 rounded-full" size="lg">
              <Link to="/shop">Start shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {lines.map((line) => (
                <div key={`${line.product_id}-${line.variant_id}`} className="flex gap-4 rounded-2xl border border-border bg-card p-3 sm:p-4">
                  <Link to="/product/$slug" params={{ slug: line.slug }} className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface sm:size-24">
                    {line.image_url ? <img src={line.image_url} alt={line.name} className="size-full object-cover" /> : null}
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <div>
                        <Link to="/product/$slug" params={{ slug: line.slug }} className="font-medium hover:text-primary">
                          {line.name}
                        </Link>
                        {line.unit_label ? <p className="text-xs text-muted-foreground">{line.unit_label}</p> : null}
                      </div>
                      <Button variant="ghost" size="icon" aria-label={`Remove ${line.name}`} onClick={() => remove(line.product_id, line.variant_id)}>
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
                      <div className="flex items-center rounded-full border border-border">
                        <Button variant="ghost" size="icon" className="size-8 rounded-full" aria-label="Fewer" onClick={() => setQty(line.product_id, line.variant_id, line.qty - 1)}>
                          <Minus />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold">{line.qty}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-full"
                          aria-label="More"
                          disabled={line.qty >= Math.min(50, line.stock)}
                          onClick={() => setQty(line.product_id, line.variant_id, line.qty + 1)}
                        >
                          <Plus />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatMoney(line.unit_price * line.qty)}</p>
                        <p className="text-xs text-muted-foreground">{formatMoney(line.unit_price)} each</p>
                      </div>
                    </div>
                    {line.stock < line.qty ? (
                      <p className="mt-1 text-xs text-destructive">Only {line.stock} left — please lower the quantity.</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <aside className="h-fit space-y-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-40">
              <div className="rounded-xl bg-background p-3 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <Truck className="size-4 text-primary" />
                  {remaining > 0 ? `Add ${formatMoney(remaining)} for free delivery` : "You've unlocked free delivery"}
                </p>
                <Progress value={Math.min(100, (subtotal / freeOver) * 100)} className="mt-2 h-2" />
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-medium">{formatMoney(subtotal)}</dd>
                </div>
                {savings > 0 ? (
                  <div className="flex justify-between text-success">
                    <dt>You save</dt>
                    <dd>{formatMoney(savings)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery</dt>
                  <dd className="text-muted-foreground">Calculated at checkout</dd>
                </div>
              </dl>
              <Button asChild size="lg" className="w-full rounded-full">
                <Link to="/checkout">
                  Checkout <ArrowRight />
                </Link>
              </Button>
              <Link to="/shop" className="block text-center text-sm text-primary hover:underline">
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
