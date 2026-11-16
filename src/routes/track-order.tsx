import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Circle, Loader2, PackageSearch, XCircle } from "lucide-react";

import { StatusBadge } from "@/components/account/account-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackOrder, type TrackedOrder } from "@/lib/catalog.functions";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ORDER_FLOW, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/track-order")({
  validateSearch: (search: Record<string, unknown>): { order?: string | undefined; phone?: string | undefined } => ({
    order: typeof search["order"] === "string" ? search["order"] : undefined,
    phone: typeof search["phone"] === "string" ? search["phone"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Track your order | AmarBazar" },
      { name: "description", content: "Enter your order number and phone to see where your AmarBazar delivery is." },
      { property: "og:title", content: "Track your order | AmarBazar" },
      { property: "og:description", content: "Follow your AmarBazar order from packing to your door." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackOrderPage,
});

function TrackOrderPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const lookup = useServerFn(trackOrder);
  const [orderNumber, setOrderNumber] = useState(search.order ?? "");
  const [phone, setPhone] = useState(search.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TrackedOrder | null | undefined>(undefined);

  async function run(order: string, tel: string) {
    if (!order.trim() || !tel.trim()) return;
    setBusy(true);
    try {
      setResult(await lookup({ data: { orderNumber: order, phone: tel } }));
    } catch {
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (search.order && search.phone) void run(search.order, search.phone);
    // Run once for links that already carry the order details.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader
        title="Track your order"
        description="Use the order number from your confirmation and the phone number you ordered with."
        crumbs={[{ label: "Track order" }]}
      />
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[340px_1fr]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void navigate({ to: "/track-order", search: { order: orderNumber.trim(), phone: phone.trim() }, replace: true });
            void run(orderNumber, phone);
          }}
          className="h-fit space-y-4 rounded-2xl border border-border bg-surface p-5"
        >
          <div className="space-y-1.5">
            <Label htmlFor="to-number">Order number</Label>
            <Input id="to-number" required value={orderNumber} onChange={(e) => setOrderNumber(e.target.value.toUpperCase())} placeholder="AB261115-1234" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to-phone">Phone number</Label>
            <Input id="to-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+974 5555 1234" />
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <PackageSearch />} Track order
          </Button>
        </form>

        <div>
          {result === undefined ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              <PackageSearch className="mx-auto size-8 text-primary" />
              <p className="mt-3">Your order's progress will appear here.</p>
            </div>
          ) : result === null ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <XCircle className="mx-auto size-8 text-destructive" />
              <p className="mt-3 font-medium">We couldn't find that order</p>
              <p className="text-sm text-muted-foreground">
                Check the order number and use the same phone number you ordered with, or{" "}
                <Link to="/contact" className="text-primary underline">contact us</Link>.
              </p>
            </div>
          ) : (
            <TrackedView order={result} />
          )}
        </div>
      </div>
    </>
  );
}

function TrackedView({ order }: { order: TrackedOrder }) {
  const cancelled = order.status === "cancelled";
  const reached = ORDER_FLOW.indexOf(order.status as OrderStatus);
  const eventAt = (status: string) => order.events.find((event) => event.status === status)?.created_at;

  return (
    <div className="rise-in space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-lg font-semibold">{order.order_number}</p>
          <p className="text-sm text-muted-foreground">Placed {formatDateTime(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {cancelled ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">This order was cancelled.</p>
      ) : (
        <ol className="space-y-0">
          {ORDER_FLOW.map((status, index) => {
            const done = index <= reached;
            const at = eventAt(status);
            return (
              <li key={status} className="relative flex gap-3 pb-5 last:pb-0">
                {index < ORDER_FLOW.length - 1 ? (
                  <span className={cn("absolute left-[11px] top-6 h-full w-0.5", index < reached ? "bg-primary" : "bg-border")} />
                ) : null}
                {done ? <CheckCircle2 className="relative size-6 shrink-0 text-primary" /> : <Circle className="relative size-6 shrink-0 text-border" />}
                <div>
                  <p className={cn("text-sm font-medium", !done && "text-muted-foreground")}>{ORDER_STATUS_LABEL[status]}</p>
                  {at ? <p className="text-xs text-muted-foreground">{formatDateTime(at)}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="border-t border-border pt-4">
        <ul className="space-y-2 text-sm">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between gap-3">
              <span>
                {item.qty} × {item.name}
                {item.unit_label ? <span className="text-muted-foreground"> · {item.unit_label}</span> : null}
              </span>
              <span>{formatMoney(Number(item.line_total))}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
          <span>Total {order.payment_method === "cod" ? "(cash on delivery)" : ""}</span>
          <span>{formatMoney(order.total)}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Delivering to {[order.area, order.city].filter(Boolean).join(", ")} · {order.customer_name}
        </p>
      </div>
    </div>
  );
}
