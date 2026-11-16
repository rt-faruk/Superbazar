import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Banknote, Heart, Leaf, Minus, Plus, ShoppingBag, Truck, Zap } from "lucide-react";
import { toast } from "sonner";

import { useCart } from "@/components/cart/cart-provider";
import { Countdown } from "@/components/home/countdown";
import { useSiteData } from "@/components/layout/site-data";
import { PriceTag } from "@/components/product/price-tag";
import { ProductGrid } from "@/components/product/product-card";
import { RatingStars } from "@/components/product/rating-stars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useWishlist } from "@/hooks/use-wishlist";
import { submitReview } from "@/lib/account.functions";
import { formatDate } from "@/lib/format";
import { effectivePrice, isFlashActive, listPrice, stockState } from "@/lib/product";
import { productQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const detail = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!detail) throw notFound();
    return {
      name: detail.product.name,
      description: detail.product.short_description ?? detail.product.description ?? "",
      image: detail.product.image_urls[0] ?? detail.product.image_url ?? null,
    };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.name ?? "Product";
    const description = loaderData?.description || `Buy ${name} at AmarBazar with delivery across Qatar.`;
    const image = loaderData?.image && loaderData.image.startsWith("https://") ? loaderData.image : null;
    return {
      meta: [
        { title: `${name} | AmarBazar` },
        { name: "description", content: description },
        { property: "og:title", content: `${name} | AmarBazar` },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">This product isn't available</h1>
      <p className="mt-2 text-muted-foreground">It may have sold out or been removed.</p>
      <Button asChild className="mt-6">
        <Link to="/shop">Back to the shop</Link>
      </Button>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(slug));
  const { settings } = useSiteData();
  const { add } = useCart();
  const wishlist = useWishlist();
  const [imageIndex, setImageIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const detail = data!;
  const { product, images, variants, reviews, related } = detail;
  const [variantId, setVariantId] = useState<string | null>(
    variants.find((v) => v.name === product.unit_label)?.id ?? variants[0]?.id ?? null,
  );

  const variant = variants.find((v) => v.id === variantId) ?? null;
  const gallery = images.length ? images.map((i) => i.url) : product.image_urls;
  const price = variant ? Number(variant.price) : effectivePrice(product);
  const was = variant ? (Number(variant.price) === effectivePrice(product) ? listPrice(product) : null) : listPrice(product);
  const stockQty = variant ? variant.stock_quantity : product.stock_quantity;
  const stock = stockState({ stock_quantity: stockQty, low_stock_threshold: product.low_stock_threshold });
  const flash = isFlashActive(product) && !variant;
  const specs = (product.specifications ?? {}) as Record<string, string>;

  function addToBasket() {
    add({ product_id: product.id, variant_id: variant?.id ?? null, qty });
    toast.success(`${product.name}${variant ? ` (${variant.name})` : ""} added to your basket`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-6 flex flex-wrap gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-primary">Shop</Link>
        {product.category_slug ? (
          <>
            <span>/</span>
            <Link to="/category/$slug" params={{ slug: product.category_slug }} className="hover:text-primary">
              {product.category_name}
            </Link>
          </>
        ) : null}
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-surface">
            {gallery[imageIndex] ? (
              <img src={gallery[imageIndex]} alt={product.name} className="size-full object-cover" />
            ) : null}
            {flash ? (
              <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-harvest px-3 py-1 text-xs font-bold text-harvest-foreground">
                <Zap className="size-3.5" /> Flash sale
              </span>
            ) : null}
          </div>
          {gallery.length > 1 ? (
            <div className="flex gap-2">
              {gallery.map((url, i) => (
                <button
                  key={url + i}
                  type="button"
                  onClick={() => setImageIndex(i)}
                  className={cn(
                    "size-20 overflow-hidden rounded-xl border-2",
                    i === imageIndex ? "border-primary" : "border-border",
                  )}
                  aria-label={`Show photo ${i + 1}`}
                >
                  <img src={url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          {product.brand_name ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{product.brand_name}</p>
          ) : null}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {product.rating_count > 0 ? (
              <a href="#reviews" className="flex items-center gap-2">
                <RatingStars value={Number(product.rating_avg)} size="md" />
                <span className="text-sm text-muted-foreground">
                  {Number(product.rating_avg).toFixed(1)} · {product.rating_count} reviews
                </span>
              </a>
            ) : null}
            {product.is_organic ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-leaf px-2.5 py-0.5 text-xs font-semibold text-leaf-foreground">
                <Leaf className="size-3" /> Organic
              </span>
            ) : null}
            {product.sold_count > 0 ? (
              <span className="text-xs text-muted-foreground">{product.sold_count}+ sold</span>
            ) : null}
          </div>

          {product.short_description ? <p className="mt-4 text-muted-foreground">{product.short_description}</p> : null}

          <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <PriceTag price={price} was={was} size="lg" />
            {flash && product.flash_sale_ends_at ? (
              <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                Ends in <Countdown endsAt={product.flash_sale_ends_at} />
              </div>
            ) : null}

            {variants.length > 0 ? (
              <div className="mt-5">
                <p className="mb-2 text-sm font-medium">Size</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVariantId(v.id);
                        setQty(1);
                      }}
                      disabled={v.stock_quantity <= 0}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm transition-colors disabled:opacity-40",
                        v.id === variantId
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary",
                      )}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : product.unit_label ? (
              <p className="mt-3 text-sm text-muted-foreground">Pack size: {product.unit_label}</p>
            ) : null}

            <p
              className={cn(
                "mt-4 text-sm font-medium",
                stock === "out" ? "text-destructive" : stock === "low" ? "text-harvest-foreground" : "text-success",
              )}
            >
              {stock === "out" ? "Out of stock" : stock === "low" ? `Only ${stockQty} left` : "In stock"}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-full border border-border bg-background">
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Fewer" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  <Minus />
                </Button>
                <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="More"
                  onClick={() => setQty((q) => Math.min(Math.max(1, Math.min(stockQty, 50)), q + 1))}
                >
                  <Plus />
                </Button>
              </div>
              <Button size="lg" className="flex-1 rounded-full" disabled={stock === "out"} onClick={addToBasket}>
                <ShoppingBag /> Add to basket
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="size-10 rounded-full"
                aria-label="Save to wishlist"
                onClick={() => wishlist.toggle(product.id)}
              >
                <Heart className={cn(wishlist.isSaved(product.id) && "fill-primary text-primary")} />
              </Button>
            </div>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Truck className="size-4 text-primary" /> Free delivery over {settings.currency_symbol}{" "}
              {Number(settings.free_shipping_over).toFixed(0)} · same-day in Doha before 6pm
            </li>
            <li className="flex items-center gap-2">
              <Banknote className="size-4 text-primary" /> Cash on delivery available
            </li>
          </ul>
        </div>
      </div>

      <Tabs defaultValue="details" className="mt-12" id="reviews">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-6 grid gap-8 md:grid-cols-[2fr_1fr]">
          <div className="space-y-4 leading-relaxed text-foreground/90">
            {product.description ? <p>{product.description}</p> : null}
            {product.ingredients ? (
              <p>
                <span className="font-semibold">Ingredients: </span>
                {product.ingredients}
              </p>
            ) : null}
          </div>
          {Object.keys(specs).length ? (
            <dl className="divide-y divide-border rounded-2xl border border-border">
              {product.sku ? (
                <div className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                  <dt className="text-muted-foreground">SKU</dt>
                  <dd className="font-medium">{product.sku}</dd>
                </div>
              ) : null}
              {Object.entries(specs).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{String(v)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </TabsContent>
        <TabsContent value="reviews" className="mt-6 grid gap-8 md:grid-cols-[2fr_1fr]">
          <div className="space-y-5">
            {reviews.length === 0 ? <p className="text-muted-foreground">No reviews yet — be the first.</p> : null}
            {reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-border p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <RatingStars value={review.rating} />
                  <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
                </div>
                {review.title ? <h3 className="mt-2 font-sans text-base font-semibold">{review.title}</h3> : null}
                {review.body ? <p className="mt-1 text-sm text-muted-foreground">{review.body}</p> : null}
                <p className="mt-2 text-xs font-medium">{review.author_name ?? "Verified shopper"}</p>
              </article>
            ))}
          </div>
          <ReviewForm productId={product.id} slug={slug} />
        </TabsContent>
      </Tabs>

      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-semibold">You might also like</h2>
          <ProductGrid products={related.slice(0, 5)} />
        </section>
      ) : null}
    </div>
  );
}

function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const { signedIn } = useSiteData();
  const queryClient = useQueryClient();
  const send = useServerFn(submitReview);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  if (!signedIn) {
    return (
      <div className="h-fit rounded-2xl bg-surface p-5 text-sm">
        <p className="font-semibold">Bought this?</p>
        <p className="mt-1 text-muted-foreground">Sign in to leave a review.</p>
        <Button asChild size="sm" className="mt-4">
          <Link to="/auth" search={{ redirect: `/product/${slug}` }}>Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      className="h-fit space-y-3 rounded-2xl bg-surface p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const result = await send({ data: { productId, rating, title, body } });
          if (result.ok) {
            toast.success(result.message);
            setTitle("");
            setBody("");
            void queryClient.invalidateQueries({ queryKey: ["product", slug] });
          } else toast.error(result.message);
        } catch {
          toast.error("Could not send your review. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="font-semibold">Write a review</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} stars`}
            onClick={() => setRating(n)}
            className={cn("text-2xl leading-none", n <= rating ? "text-star" : "text-border")}
          >
            ★
          </button>
        ))}
      </div>
      <Input placeholder="Headline" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      <Textarea placeholder="What did you like or dislike?" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={4} />
      <Button type="submit" disabled={busy} className="w-full">
        Send review
      </Button>
    </form>
  );
}
