import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { StatusBadge } from "@/components/account/account-shell";
import { AdminTitle, EmptyRow, Panel } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { adminOrdersQuery } from "@/lib/admin-queries";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ORDER_FLOW, ORDER_STATUS_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/orders/")({
  component: AdminOrdersPage,
});

const FILTERS = ["", ...ORDER_FLOW, "cancelled"] as const;

function AdminOrdersPage() {
  const [status, setStatus] = useState<string>("");
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const { data: orders = [], isLoading } = useQuery(adminOrdersQuery({ status: status || undefined, search: search || undefined }));

  return (
    <>
      <AdminTitle title="Orders" description="Confirm, pack and dispatch cash-on-delivery orders." />
      <div className="mb-4 flex flex-wrap gap-1">
        {FILTERS.map((value) => (
          <button
            key={value || "all"}
            type="button"
            onClick={() => setStatus(value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              status === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent",
            )}
          >
            {value ? ORDER_STATUS_LABEL[value] : "All"}
          </button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(term.trim());
        }}
        className="relative mb-4 max-w-md"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Order number, name or phone" className="pl-9" />
      </form>
      <Panel className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <EmptyRow colSpan={5}>Loading orders…</EmptyRow>
            ) : orders.length === 0 ? (
              <EmptyRow colSpan={5}>No orders match.</EmptyRow>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link to="/admin/orders/$id" params={{ id: order.id }} className="font-mono font-semibold text-primary hover:underline">
                      {order.order_number}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                  </td>
                  <td className="px-4 py-3">
                    {order.customer_name}
                    <p className="text-xs text-muted-foreground">
                      {order.phone}
                      {order.city ? ` · ${order.city}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">{order.item_count}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMoney(order.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
