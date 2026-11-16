import { queryOptions } from "@tanstack/react-query";

import {
  getCatalogueStats,
  getProductBySlug,
  getSettings,
  listBanners,
  listBrands,
  listCategories,
  listProducts,
  listShippingMethods,
  type ProductQuery,
} from "./catalog.functions";

export const settingsQuery = () =>
  queryOptions({ queryKey: ["settings"], queryFn: () => getSettings(), staleTime: 5 * 60_000 });

export const categoriesQuery = () =>
  queryOptions({ queryKey: ["categories"], queryFn: () => listCategories(), staleTime: 5 * 60_000 });

export const brandsQuery = () =>
  queryOptions({ queryKey: ["brands"], queryFn: () => listBrands(), staleTime: 5 * 60_000 });

export const bannersQuery = (position: string) =>
  queryOptions({
    queryKey: ["banners", position],
    queryFn: () => listBanners({ data: { position } }),
    staleTime: 5 * 60_000,
  });

export const productsQuery = (query: ProductQuery) =>
  queryOptions({
    queryKey: ["products", query],
    queryFn: () => listProducts({ data: query }),
    staleTime: 60_000,
  });

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug({ data: { slug } }),
    staleTime: 60_000,
  });

export const shippingMethodsQuery = () =>
  queryOptions({
    queryKey: ["shipping-methods"],
    queryFn: () => listShippingMethods(),
    staleTime: 5 * 60_000,
  });

export const statsQuery = () =>
  queryOptions({ queryKey: ["catalogue-stats"], queryFn: () => getCatalogueStats(), staleTime: 5 * 60_000 });
