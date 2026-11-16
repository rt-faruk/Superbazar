import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { useSiteData } from "@/components/layout/site-data";
import { ProductGrid } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ProductPage, SortKey } from "@/lib/catalog.functions";
import type { ShopSearch } from "@/lib/shop-search";
import { cn } from "@/lib/utils";

const SORT_LABELS: Record<SortKey, string> = {
  latest: "Newest",
  best_selling: "Best selling",
  popular: "Most popular",
  rating: "Top rated",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

type Props = {
  page: ProductPage;
  search: ShopSearch;
  onChange: (next: ShopSearch) => void;
  /** Hide the department filter on a department page. */
  lockedCategory?: string | undefined;
};

export function ShopListing({ page, search, onChange, lockedCategory }: Props) {
  const [open, setOpen] = useState(false);
  const update = (patch: Partial<ShopSearch>) => onChange({ ...search, ...patch, page: undefined });
  const activeCount = [
    search.brand,
    !lockedCategory && search.category,
    search.minPrice != null,
    search.maxPrice != null,
    search.minRating,
    search.inStockOnly,
    search.onSaleOnly,
    search.organicOnly,
    search.featuredOnly,
    search.flashSaleOnly,
  ].filter(Boolean).length;

  const filters = <Filters search={search} update={update} lockedCategory={lockedCategory} />;

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block">{filters}</aside>
      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {page.total} {page.total === 1 ? "product" : "products"}
            {search.search ? (
              <>
                {" "}for <span className="font-medium text-foreground">“{search.search}”</span>
              </>
            ) : null}
          </p>
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal /> Filters{activeCount ? ` (${activeCount})` : ""}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-6">{filters}</div>
              </SheetContent>
            </Sheet>
            <Select value={search.sort ?? "latest"} onValueChange={(v) => update({ sort: v as SortKey })}>
              <SelectTrigger className="w-[180px]" aria-label="Sort products">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeCount > 0 || search.search ? (
          <div className="mb-5 flex flex-wrap gap-2">
            {search.search ? <Chip label={`“${search.search}”`} onClear={() => update({ search: undefined })} /> : null}
            {search.flashSaleOnly ? <Chip label="Flash sale" onClear={() => update({ flashSaleOnly: undefined })} /> : null}
            {search.onSaleOnly ? <Chip label="On sale" onClear={() => update({ onSaleOnly: undefined })} /> : null}
            {search.organicOnly ? <Chip label="Organic" onClear={() => update({ organicOnly: undefined })} /> : null}
            {search.featuredOnly ? <Chip label="Featured" onClear={() => update({ featuredOnly: undefined })} /> : null}
            {search.inStockOnly ? <Chip label="In stock" onClear={() => update({ inStockOnly: undefined })} /> : null}
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => onChange({ sort: search.sort })}
            >
              Clear all
            </button>
          </div>
        ) : null}

        {page.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-lg font-medium">Nothing matches those filters</p>
            <p className="mt-1 text-sm text-muted-foreground">Try removing a filter or searching for something else.</p>
            <Button variant="outline" className="mt-4" onClick={() => onChange({})}>
              Show all products
            </Button>
          </div>
        ) : (
          <ProductGrid products={page.items} />
        )}

        {page.totalPages > 1 ? (
          <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Pages">
            {Array.from({ length: page.totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  onChange({ ...search, page: n === 1 ? undefined : n });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  "grid size-9 place-items-center rounded-full text-sm",
                  n === page.page ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
                aria-current={n === page.page ? "page" : undefined}
              >
                {n}
              </button>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
      {label}
      <button type="button" onClick={onClear} aria-label={`Remove ${label}`}>
        <X className="size-3" />
      </button>
    </span>
  );
}

function Filters({
  search,
  update,
  lockedCategory,
}: {
  search: ShopSearch;
  update: (patch: Partial<ShopSearch>) => void;
  lockedCategory?: string | undefined;
}) {
  const { categories, brands } = useSiteData();
  const [min, setMin] = useState(search.minPrice?.toString() ?? "");
  const [max, setMax] = useState(search.maxPrice?.toString() ?? "");
  const departments = categories.filter((c) => !c.parent_id);
  const subs = lockedCategory
    ? categories.filter((c) => c.parent_id && categories.find((p) => p.id === c.parent_id)?.slug === lockedCategory)
    : [];

  const toggles: Array<[keyof ShopSearch, string]> = [
    ["inStockOnly", "In stock only"],
    ["onSaleOnly", "On sale"],
    ["flashSaleOnly", "Flash sale"],
    ["organicOnly", "Organic"],
    ["featuredOnly", "Featured"],
  ];

  return (
    <div className="space-y-7">
      {!lockedCategory ? (
        <FilterGroup title="Department">
          <FilterLink active={!search.category} onClick={() => update({ category: undefined })}>
            All departments
          </FilterLink>
          {departments.map((c) => (
            <FilterLink key={c.id} active={search.category === c.slug} onClick={() => update({ category: c.slug })}>
              {c.name}
            </FilterLink>
          ))}
        </FilterGroup>
      ) : subs.length > 0 ? (
        <FilterGroup title="Shelves">
          {subs.map((c) => (
            <a key={c.id} href={`/category/${c.slug}`} className="block rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
              {c.name}
            </a>
          ))}
        </FilterGroup>
      ) : null}

      <FilterGroup title="Brand">
        <FilterLink active={!search.brand} onClick={() => update({ brand: undefined })}>
          All brands
        </FilterLink>
        {brands.map((b) => (
          <FilterLink key={b.id} active={search.brand === b.slug} onClick={() => update({ brand: b.slug })}>
            {b.name}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title="Price (QAR)">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ minPrice: min ? Number(min) : undefined, maxPrice: max ? Number(max) : undefined });
          }}
        >
          <Input type="number" min={0} placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} aria-label="Minimum price" />
          <span className="text-muted-foreground">–</span>
          <Input type="number" min={0} placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} aria-label="Maximum price" />
          <Button type="submit" size="sm" variant="secondary">
            Go
          </Button>
        </form>
      </FilterGroup>

      <FilterGroup title="Rating">
        {[4, 3].map((r) => (
          <FilterLink key={r} active={search.minRating === r} onClick={() => update({ minRating: search.minRating === r ? undefined : r })}>
            {r}★ and up
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title="Show">
        {toggles.map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 py-1">
            <Checkbox
              id={`f-${key}`}
              checked={Boolean(search[key])}
              onCheckedChange={(v) => update({ [key]: v ? true : undefined } as Partial<ShopSearch>)}
            />
            <Label htmlFor={`f-${key}`} className="text-sm font-normal">
              {label}
            </Label>
          </div>
        ))}
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FilterLink({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full rounded-md px-2 py-1 text-left text-sm transition-colors",
        active ? "bg-secondary font-medium text-secondary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
