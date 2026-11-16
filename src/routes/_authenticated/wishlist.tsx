import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AccountShell } from "@/components/account/account-shell";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/hooks/use-wishlist";
import { accountQuery } from "@/lib/account-queries";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/wishlist")({
  head: () => ({
    meta: [
      { title: "My wishlist | AmarBazar" },
      { name: "description", content: "Products you saved on AmarBazar to buy later." },
      { property: "og:title", content: "My wishlist | AmarBazar" },
      { property: "og:description", content: "Your saved AmarBazar favourites." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(accountQuery()),
  component: WishlistPage,
});

function WishlistPage() {
  const { data: account } = useSuspenseQuery(accountQuery());
  const wishlist = useWishlist();
  const { add } = useCart();

  return (
    <AccountShell title="Wishlist">
      {account.wishlist.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Heart className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-medium">Nothing saved yet</p>
          <p className="text-sm text-muted-foreground">Tap the heart on any product to keep it here.</p>
          <Button asChild className="mt-4">
            <Link to="/shop">Browse products</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {account.wishlist.map((item) => (
            <li key={item.product_id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
              <Link to="/product/$slug" params={{ slug: item.slug }} className="aspect-square bg-surface">
                {item.image_url ? <img src={item.image_url} alt={item.name} loading="lazy" className="size-full object-cover" /> : null}
              </Link>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <Link to="/product/$slug" params={{ slug: item.slug }} className="line-clamp-2 text-sm font-medium hover:text-primary">
                  {item.name}
                </Link>
                <p className="font-semibold">{formatMoney(item.price)}</p>
                <div className="mt-auto flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      add({ product_id: item.product_id, variant_id: null, qty: 1 });
                      toast.success(`${item.name} added to your basket`);
                    }}
                  >
                    <Plus /> Basket
                  </Button>
                  <Button size="sm" variant="outline" aria-label={`Remove ${item.name}`} disabled={wishlist.pending} onClick={() => wishlist.toggle(item.product_id)}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
