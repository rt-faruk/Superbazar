import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/page-header";
import { ShopListing } from "@/components/shop/shop-listing";
import { productsQuery } from "@/lib/queries";
import { parseShopSearch, toProductQuery } from "@/lib/shop-search";

export const Route = createFileRoute("/shop")({
  validateSearch: parseShopSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(productsQuery(toProductQuery(deps))),
  head: () => ({
    meta: [
      { title: "Shop all groceries | AmarBazar" },
      { name: "description", content: "Browse honey, dates, spices, rice, oils, nuts and pantry staples delivered across Qatar." },
      { property: "og:title", content: "Shop all groceries | AmarBazar" },
      { property: "og:description", content: "Every product in the AmarBazar pantry, with filters for price, brand and offers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = useSuspenseQuery(productsQuery(toProductQuery(search)));
  const title = search.flashSaleOnly
    ? "Flash sale"
    : search.search
      ? `Results for “${search.search}”`
      : "All products";

  return (
    <>
      <PageHeader title={title} crumbs={[{ label: "Shop" }]} description="Pantry staples, checked by hand and delivered across Qatar." />
      <ShopListing page={data} search={search} onChange={(next) => void navigate({ search: next })} />
    </>
  );
}
