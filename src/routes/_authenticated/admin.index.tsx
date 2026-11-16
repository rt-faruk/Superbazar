import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Banknote, Boxes, Clock, Mail, MessageSquareText, Package, Users } from "lucide-react";

import { StatusBadge } from "@/components/account/account-shell";
import { AdminTitle, Panel } from "@/components/admin/admin-ui";
import { adminOrdersQuery, adminStatsQuery } from "@/lib/admin-queries";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ORDER_FLOW, ORDER_STATUS_LABEL } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminStatsQuery()),
      context.queryClient.ensureQueryData(adminOrdersQuery({})),
    ]),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useSuspenseQuery(adminStatsQuery());
  const { data: orders } = useSuspenseQuery(adminOrdersQuery({}));

  const cards = [
    { label: "Revenue (excl. cancelled)", value: formatMoney(stats.revenue), icon: Banknote },
    { label: "Orders", value: stats.orders, icon: Package, to: "/admin/orders" as const },
    { label: "Waiting to confirm", value: stats.pending_orders, icon: Clock, to: "/admin/orders" as const, alert: stats.pending_orders > 0 },
    { label: "Customers", value: stats.customers, icon: Users },
    { label: "Products", value: stats.products, icon: Boxes, to: "/admin/products" as const },
    { label: "Low / out of stock", value: `${stats.low_stock} / ${stats.out_of_stock}`, icon: AlertTriangle, to: "/admin/products" as const, alert: stats.out_of_stock > 0 },
    { label: "Reviews to approve", value: stats.pending_reviews, icon: MessageSquareText, to: "/admin/reviews" as const, alert: stats.pending_reviews > 0 },
    { label: "Newsletter subscribers", value: stats.subscribers, icon: Mail, to: "/admin/subscribers" as const },
  ];

  return (
    <>
      <AdminTitle title="Dashboard" description="How the shop is doing today." />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => {
          const body = (
            <>
              <card.icon className={`size-5 ${card.alert ? "text-harvest-foreground" : "text-primary"}`} />
              <p className="mt-3 text-2xl font-semibold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </>
          );
          return card.to ? (
            <Link key={card.label} to={card.to} className={`card-lift rounded-2xl border p-4 ${card.alert ? "border-harvest bg-harvest/10" : "border-border bg-card"}`}>
              {body}
            </Link>
          ) : (
            <div key={card.label} className="rounded-2xl border border-border bg-card p-4">
              {body}
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <Panel title="Latest orders">
          {orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {orders.slice(0, 8).map((order) => (
                <li key={order.id}>
                  <Link to="/admin/orders/$id" params={{ id: order.id }} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-primary">
                    <span>
                      <span className="font-mono text-sm font-semibold">{order.order_number}</span>
                      <span className="block text-xs text-muted-foreground">
                        {order.customer_name} · {formatDateTime(order.created_at)}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <StatusBadge status={order.status} />
                      <span className="text-sm font-semibold">{formatMoney(order.total)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Orders by status">
          <ul className="space-y-2 text-sm">
            {[...ORDER_FLOW, "cancelled" as const].map((status) => (
              <li key={status} className="flex items-center justify-between">
                <span className="text-muted-foreground">{ORDER_STATUS_LABEL[status]}</span>
                <span className="font-semibold">{stats.by_status[status] ?? 0}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
