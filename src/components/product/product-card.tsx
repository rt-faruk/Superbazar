import { Link } from "@tanstack/react-router";
import { Heart, Leaf, Plus, Zap } from "lucide-react";
import { toast } from "sonner";

import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/hooks/use-wishlist";
import { discountPercent } from "@/lib/format";
import { effectivePrice, isFlashActive, listPrice, stockState } from "@/lib/product";
import type { ProductCard as ProductCardData } from "@/lib/types";
import { cn } from "@/lib/utils";

import { PriceTag } from "./price-tag";
import { RatingStars } from "./rating-stars";

export function ProductCard({ product }: { product: ProductCardData }) {
  const { add } = useCart();
  const wishlist = useWishlist();
  const price = effectivePrice(product);
  const was = listPrice(product);
  const off = discountPercent(price, was);
  const stock = stockState(product);
  const image = product.image_urls[0] ?? product.image_url ?? "";
  const saved = wishlist.isSaved(product.id);

  return (
    <article className="card-lift group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-square overflow-hidden bg-surface"
      >
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {isFlashActive(product) ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-harvest px-2 py-0.5 text-[11px] font-bold text-harvest-foreground">
              <Zap className="size-3" /> Flash
            </span>
          ) : off > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
              −{off}%
            </span>
          ) : null}
          {product.is_organic ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-leaf px-2 py-0.5 text-[11px] font-semibold text-leaf-foreground">
              <Leaf className="size-3" /> Organic
            </span>
          ) : null}
        </div>
        {stock === "out" ? (
          <span className="absolute inset-x-0 bottom-0 bg-foreground/70 py-1.5 text-center text-xs font-semibold text-background">
            Out of stock
          </span>
        ) : null}
      </Link>

      <button
        type="button"
        onClick={() => wishlist.toggle(product.id)}
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:text-primary"
      >
        <Heart className={cn("size-4", saved && "fill-primary text-primary")} />
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {product.brand_name ? (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {product.brand_name}
          </p>
        ) : null}
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          className="line-clamp-2 text-sm font-medium leading-snug text-foreground hover:text-primary"
        >
          {product.name}
        </Link>
        {product.rating_count > 0 ? (
          <RatingStars value={Number(product.rating_avg)} count={product.rating_count} />
        ) : null}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <PriceTag price={price} was={was} />
            {product.unit_label ? (
              <p className="text-xs text-muted-foreground">{product.unit_label}</p>
            ) : null}
          </div>
          <Button
            size="icon"
            variant="default"
            className="shrink-0 rounded-full"
            disabled={stock === "out"}
            aria-label={`Add ${product.name} to basket`}
            onClick={() => {
              add({ product_id: product.id, variant_id: null, qty: 1 });
              toast.success(`${product.name} added to your basket`);
            }}
          >
            <Plus />
          </Button>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
