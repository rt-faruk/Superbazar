import { queryOptions } from "@tanstack/react-query";

import { getAccount, myOrders } from "./account.functions";

/** Signed-in only: use from components or loaders under the _authenticated gate. */
export const accountQuery = () =>
  queryOptions({ queryKey: ["account"], queryFn: () => getAccount(), staleTime: 30_000 });

export const myOrdersQuery = () =>
  queryOptions({ queryKey: ["my-orders"], queryFn: () => myOrders(), staleTime: 30_000 });
