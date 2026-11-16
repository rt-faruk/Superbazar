import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Package } from "lucide-react";

import { AccountShell, StatusBadge } from "@/components/account/account-shell";
import { Button } from "@/components/ui/button";
import { accountQuery, myOrdersQuery } from "@/lib/account-queries";
import { formatDate, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/account/orders")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(myOrdersQuery()),
      context.queryClient.ensureQueryData(accountQuery()),
    ]),
  component: MyOrdersPage,
});

function MyOrdersPage() {
  const { data: orders } = useSuspenseQuery(myOrdersQuery());
  const { data: account } = useSuspenseQuery(accountQuery());
  const phone = account.profile?.phone ?? "";

  return (
    <AccountShell title="My orders">
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Package className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-medium">No orders yet</p>
          <p className="text-sm text-muted-foreground">Orders you place while signed in show up here.</p>
          <Button asChild className="mt-4">
            <Link to="/shop">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-semibold">{order.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.created_at)} · {order.item_count} item{order.item_count === 1 ? "" : "s"}
                    {order.city ? ` · ${order.city}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={order.status} />
                  <span className="font-semibold">{formatMoney(order.total)}</span>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                {order.items.map((item) => `${item.qty} × ${item.name}`).join(", ")}
              </p>
              <div className="mt-3">
                <Button asChild variant="outline" size="sm">
                  <Link to="/track-order" search={{ order: order.order_number, phone: phone || undefined }}>
                    Track order
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
