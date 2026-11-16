import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/account/account-shell";
import { AdminTitle, Panel } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminUpdateOrder } from "@/lib/admin.functions";
import { adminOrderQuery } from "@/lib/admin-queries";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ORDER_FLOW, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/orders/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(adminOrderQuery(params.id)),
  component: AdminOrderDetailPage,
});

function AdminOrderDetailPage() {
  const { id } = Route.useParams();
  const { data: order } = useSuspenseQuery(adminOrderQuery(id));
  const queryClient = useQueryClient();
  const update = useServerFn(adminUpdateOrder);
  const [status, setStatus] = useState<string>(order?.status ?? "pending");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (order) setStatus(order.status);
  }, [order]);

  const mutation = useMutation({
    mutationFn: () => update({ data: { id, status, note } }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Order updated");
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: () => toast.error("Could not update this order."),
  });

  if (!order) {
    return (
      <div className="py-16 text-center">
        <p className="font-medium">Order not found</p>
        <Link to="/admin/orders" className="text-sm text-primary underline">Back to orders</Link>
      </div>
    );
  }

  const events = [...order.events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const address = [
    order.building_number && `Building ${order.building_number}`,
    order.apartment_number && `Apt ${order.apartment_number}`,
    order.street,
    order.area,
    order.city,
  ].filter(Boolean);
  const phoneDigits = order.phone.replace(/[^\d]/g, "");

  return (
    <>
      <Link to="/admin/orders" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> All orders
      </Link>
      <AdminTitle
        title={order.order_number}
        description={`Placed ${formatDateTime(order.created_at)} · ${order.payment_method === "cod" ? "Cash on delivery" : order.payment_method} · ${order.payment_status}`}
        actions={<StatusBadge status={order.status} />}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel title="Items">
            <ul className="divide-y divide-border">
              {order.items.map((item, index) => (
                <li key={index} className="flex items-center gap-3 py-3">
                  <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-surface">
                    {item.image_url ? <img src={item.image_url} alt="" className="size-full object-cover" /> : null}
                  </span>
                  <span className="flex-1 text-sm">
                    {item.name}
                    <span className="block text-xs text-muted-foreground">
                      {item.qty} × {formatMoney(Number(item.unit_price))}
                      {item.unit_label ? ` · ${item.unit_label}` : ""}
                    </span>
                  </span>
                  <span className="text-sm font-semibold">{formatMoney(Number(item.line_total))}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <Line label="Subtotal" value={formatMoney(Number(order.subtotal))} />
              {Number(order.discount) > 0 ? <Line label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`} value={`− ${formatMoney(Number(order.discount))}`} /> : null}
              <Line label="Delivery" value={Number(order.shipping_fee) === 0 ? "Free" : formatMoney(Number(order.shipping_fee))} />
              {Number(order.tax) > 0 ? <Line label="Tax" value={formatMoney(Number(order.tax))} /> : null}
              <div className="flex justify-between pt-2 text-base font-semibold">
                <dt>Total to collect</dt>
                <dd>{formatMoney(Number(order.total))}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="History">
            <ol className="space-y-3">
              {events.map((event, index) => (
                <li key={index} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  <span>
                    <span className="font-medium">{ORDER_STATUS_LABEL[event.status as OrderStatus] ?? event.status}</span>
                    <span className="text-muted-foreground"> · {formatDateTime(event.created_at)}</span>
                    {event.note ? <span className="block text-muted-foreground">{event.note}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Update status">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate();
              }}
              className="space-y-3"
            >
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger aria-label="Order status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...ORDER_FLOW, "cancelled" as const].map((value) => (
                    <SelectItem key={value} value={value}>{ORDER_STATUS_LABEL[value]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1.5">
                <Label htmlFor="order-note">Note (shown to the customer)</Label>
                <Textarea id="order-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Driver on the way" />
              </div>
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="animate-spin" /> : null} Save status
              </Button>
              <p className="text-xs text-muted-foreground">Marking an order delivered also marks it paid.</p>
            </form>
          </Panel>

          <Panel title="Customer">
            <p className="font-medium">{order.customer_name}</p>
            <p className="text-sm text-muted-foreground">{order.phone}</p>
            {order.email ? <p className="text-sm text-muted-foreground">{order.email}</p> : null}
            <div className="mt-3 flex gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={`tel:${order.phone}`}><Phone /> Call</a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>
              </Button>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deliver to</p>
            <p className="text-sm">{address.join(", ")}</p>
            {order.delivery_instructions ? <p className="mt-1 text-sm text-muted-foreground">“{order.delivery_instructions}”</p> : null}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
