import { queryOptions } from "@tanstack/react-query";

import {
  adminLookup,
  adminNewsletter,
  adminOrderDetail,
  adminOrders,
  adminProductDetail,
  adminProducts,
  adminReviews,
  adminSettings,
  adminSimpleList,
  adminStats,
} from "./admin.functions";

/** Admin only: every function re-checks the admin role on the server. */
export const adminStatsQuery = () => queryOptions({ queryKey: ["admin", "stats"], queryFn: () => adminStats() });

export const adminOrdersQuery = (filter: { status?: string | undefined; search?: string | undefined }) =>
  queryOptions({ queryKey: ["admin", "orders", filter], queryFn: () => adminOrders({ data: filter }) });

export const adminOrderQuery = (id: string) =>
  queryOptions({ queryKey: ["admin", "order", id], queryFn: () => adminOrderDetail({ data: { id } }) });

export const adminProductsQuery = (search: string) =>
  queryOptions({ queryKey: ["admin", "products", search], queryFn: () => adminProducts({ data: { search } }) });

export const adminProductQuery = (id: string) =>
  queryOptions({ queryKey: ["admin", "product", id], queryFn: () => adminProductDetail({ data: { id } }) });

export const adminLookupQuery = () => queryOptions({ queryKey: ["admin", "lookup"], queryFn: () => adminLookup() });

export const adminReviewsQuery = (pendingOnly: boolean) =>
  queryOptions({ queryKey: ["admin", "reviews", pendingOnly], queryFn: () => adminReviews({ data: { pendingOnly } }) });

export const adminSettingsQuery = () => queryOptions({ queryKey: ["admin", "settings"], queryFn: () => adminSettings() });

export type SimpleTable = "categories" | "brands" | "banners" | "coupons";
export const adminListQuery = (table: SimpleTable) =>
  queryOptions({ queryKey: ["admin", "list", table], queryFn: () => adminSimpleList({ data: { table } }) });

export const adminNewsletterQuery = () => queryOptions({ queryKey: ["admin", "newsletter"], queryFn: () => adminNewsletter() });
