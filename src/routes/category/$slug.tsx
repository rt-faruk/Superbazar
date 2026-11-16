import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/page-header";
import { ShopListing } from "@/components/shop/shop-listing";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { parseShopSearch, toProductQuery } from "@/lib/shop-search";

export const Route = createFileRoute("/category/$slug")({
  validateSearch: parseShopSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params, deps }) => {
    const categories = await context.queryClient.ensureQueryData(categoriesQuery());
    const category = categories.find((c) => c.slug === params.slug);
    if (!category) throw notFound();
    await context.queryClient.ensureQueryData(productsQuery(toProductQuery(deps, params.slug)));
    const parent = category.parent_id ? categories.find((c) => c.id === category.parent_id) : undefined;
    return { name: category.name, description: category.description, parent: parent ? { name: parent.name, slug: parent.slug } : null };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.name ?? "Department";
    const description = loaderData?.description ?? `Shop ${name} at AmarBazar, delivered across Qatar.`;
    return {
      meta: [
        { title: `${name} | AmarBazar` },
        { name: "description", content: description },
        { property: "og:title", content: `${name} | AmarBazar` },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const info = Route.useLoaderData();
  const { data } = useSuspenseQuery(productsQuery(toProductQuery(search, slug)));

  const crumbs = [
    { label: "Shop", to: "/shop" },
    ...(info.parent ? [{ label: info.parent.name, to: `/category/${info.parent.slug}` }] : []),
    { label: info.name },
  ];

  return (
    <>
      <PageHeader title={info.name} description={info.description ?? undefined} crumbs={crumbs} />
      <ShopListing page={data} search={search} lockedCategory={slug} onChange={(next) => void navigate({ search: next })} />
    </>
  );
}
