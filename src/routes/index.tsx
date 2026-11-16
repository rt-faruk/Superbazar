import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Banknote, Leaf, ShieldCheck, Truck, Zap } from "lucide-react";
import { toast } from "sonner";

import { Countdown } from "@/components/home/countdown";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { useSiteData } from "@/components/layout/site-data";
import { ProductGrid } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeNewsletter } from "@/lib/catalog.functions";
import { bannersQuery, productsQuery, statsQuery } from "@/lib/queries";

const FLASH = { flashSaleOnly: true, sort: "best_selling" as const, perPage: 10 };
const FEATURED = { featuredOnly: true, sort: "popular" as const, perPage: 10 };
const BEST = { sort: "best_selling" as const, perPage: 10 };
const ORGANIC = { organicOnly: true, sort: "rating" as const, perPage: 5 };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AmarBazar — Honey, dates, spices & groceries delivered in Qatar" },
      {
        name: "description",
        content:
          "Shop raw honey, premium dates, fresh-ground spices, basmati rice and pantry staples. Same-day delivery in Doha, cash on delivery.",
      },
      { property: "og:title", content: "AmarBazar — Groceries delivered across Qatar" },
      {
        property: "og:description",
        content: "Raw honey, premium dates, spices, rice and pantry staples with cash on delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(bannersQuery("hero")),
      context.queryClient.ensureQueryData(bannersQuery("promo")),
      context.queryClient.ensureQueryData(productsQuery(FLASH)),
      context.queryClient.ensureQueryData(productsQuery(FEATURED)),
      context.queryClient.ensureQueryData(productsQuery(BEST)),
      context.queryClient.ensureQueryData(productsQuery(ORGANIC)),
      context.queryClient.ensureQueryData(statsQuery()),
    ]),
  component: HomePage,
});

function SectionTitle({
  eyebrow,
  title,
  to,
  search,
  children,
}: {
  eyebrow?: string;
  title: string;
  to?: "/shop";
  search?: Record<string, unknown>;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      <div className="flex items-center gap-4">
        {children}
        {to ? (
          <Link
            to={to}
            search={search as never}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function HomePage() {
  const { categories, settings } = useSiteData();
  const { data: hero } = useSuspenseQuery(bannersQuery("hero"));
  const { data: promo } = useSuspenseQuery(bannersQuery("promo"));
  const { data: flash } = useSuspenseQuery(productsQuery(FLASH));
  const { data: featured } = useSuspenseQuery(productsQuery(FEATURED));
  const { data: best } = useSuspenseQuery(productsQuery(BEST));
  const { data: organic } = useSuspenseQuery(productsQuery(ORGANIC));
  const { data: stats } = useSuspenseQuery(statsQuery());

  const departments = categories.filter((c) => !c.parent_id);
  const flashEnds = flash.items
    .map((p) => p.flash_sale_ends_at)
    .filter((v): v is string => Boolean(v))
    .sort()[0];
  const promoBanner = promo[0];

  return (
    <div className="pb-8">
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <HeroCarousel banners={hero} />
      </div>

      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: Truck, title: "Same-day in Doha", text: `Free over ${settings.currency_symbol} ${Number(settings.free_shipping_over).toFixed(0)}` },
            { icon: Banknote, title: "Cash on delivery", text: "Pay when it arrives" },
            { icon: Leaf, title: `${stats.products}+ products`, text: `${stats.categories} departments, ${stats.brands} brands` },
            { icon: ShieldCheck, title: "Checked by hand", text: "Every order, before dispatch" },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-pad mx-auto max-w-7xl">
        <SectionTitle eyebrow="Browse" title="Shop by department" to="/shop" />
        <div className="hide-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-7">
          {departments.map((category) => (
            <Link
              key={category.id}
              to="/category/$slug"
              params={{ slug: category.slug }}
              className="group flex w-24 shrink-0 flex-col items-center gap-2 text-center sm:w-auto"
            >
              <span className="block aspect-square w-full overflow-hidden rounded-full border-2 border-border bg-surface transition-colors group-hover:border-primary">
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : null}
              </span>
              <span className="text-xs font-medium text-foreground sm:text-sm">{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {flash.items.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4">
          <div className="rounded-3xl bg-harvest/15 p-5 sm:p-8">
            <SectionTitle eyebrow="Limited time" title="Flash sale" to="/shop" search={{ flashSaleOnly: true }}>
              {flashEnds ? <Countdown endsAt={flashEnds} /> : <Zap className="size-5 text-harvest-foreground" />}
            </SectionTitle>
            <ProductGrid products={flash.items} />
          </div>
        </section>
      ) : null}

      <section className="section-pad mx-auto max-w-7xl">
        <SectionTitle eyebrow="Hand-picked" title="Featured this week" to="/shop" search={{ featuredOnly: true }} />
        <ProductGrid products={featured.items} />
      </section>

      {promoBanner ? (
        <section className="mx-auto max-w-7xl px-4">
          <div className="relative overflow-hidden rounded-3xl bg-leaf">
            {promoBanner.image_url ? (
              <img
                src={promoBanner.image_url}
                alt=""
                loading="lazy"
                className="absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover md:block"
              />
            ) : null}
            <div className="relative max-w-xl p-8 sm:p-12 md:w-1/2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf-foreground">Organic shelf</p>
              <h2 className="mt-2 text-3xl font-semibold text-leaf-foreground sm:text-4xl">{promoBanner.title}</h2>
              {promoBanner.subtitle ? <p className="mt-3 text-leaf-foreground/80">{promoBanner.subtitle}</p> : null}
              {promoBanner.link_url ? (
                <Button asChild className="mt-6 rounded-full" size="lg">
                  <a href={promoBanner.link_url}>
                    {promoBanner.cta_label ?? "Shop now"} <ArrowRight />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section-pad mx-auto max-w-7xl">
        <SectionTitle eyebrow="Most ordered" title="Best sellers" to="/shop" search={{ sort: "best_selling" }} />
        <ProductGrid products={best.items} />
      </section>

      {organic.items.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 pb-10">
          <SectionTitle eyebrow="Certified" title="Organic favourites" to="/shop" search={{ organicOnly: true }} />
          <ProductGrid products={organic.items} />
        </section>
      ) : null}

      <Newsletter />
    </div>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const subscribe = useServerFn(subscribeNewsletter);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await subscribe({ data: { email } });
      if (result.ok) {
        toast.success(result.message);
        setEmail("");
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Could not save your email. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4">
      <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary p-8 text-primary-foreground sm:p-12 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-3xl font-semibold">Fresh deals in your inbox</h2>
          <p className="mt-2 text-primary-foreground/80">New arrivals, flash sales and seasonal picks — about twice a month.</p>
        </div>
        <form onSubmit={submit} className="flex w-full max-w-md gap-2">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            className="h-11 rounded-full border-primary-foreground/30 bg-background text-foreground"
          />
          <Button type="submit" variant="harvest" size="lg" className="h-11 rounded-full" disabled={busy}>
            Subscribe
          </Button>
        </form>
      </div>
    </section>
  );
}
