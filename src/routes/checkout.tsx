import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Banknote, CheckCircle2, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";

import { useCartView } from "@/components/cart/use-cart-view";
import { PageHeader } from "@/components/layout/page-header";
import { useSiteData } from "@/components/layout/site-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getAccount } from "@/lib/account.functions";
import { validateCoupon, type CouponResult } from "@/lib/catalog.functions";
import { placeOrder, type PlacedOrder } from "@/lib/checkout.functions";
import { formatMoney } from "@/lib/format";
import { QATAR_CITIES } from "@/lib/qatar";
import { shippingMethodsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout | AmarBazar" },
      { name: "description", content: "Enter your delivery details and place your cash-on-delivery order." },
      { property: "og:title", content: "Checkout | AmarBazar" },
      { property: "og:description", content: "Place your AmarBazar order with cash on delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(shippingMethodsQuery()),
  component: CheckoutPage,
});

type Form = {
  name: string;
  phone: string;
  email: string;
  city: string;
  area: string;
  street: string;
  building_number: string;
  apartment_number: string;
  delivery_instructions: string;
};

const EMPTY: Form = {
  name: "",
  phone: "",
  email: "",
  city: "Doha",
  area: "",
  street: "",
  building_number: "",
  apartment_number: "",
  delivery_instructions: "",
};

function CheckoutPage() {
  const { settings, signedIn, session } = useSiteData();
  const { lines, subtotal, items, loading, clear } = useCartView();
  const queryClient = useQueryClient();
  const { data: methods } = useQuery(shippingMethodsQuery());
  const fetchAccount = useServerFn(getAccount);
  const checkCoupon = useServerFn(validateCoupon);
  const submit = useServerFn(placeOrder);

  const [form, setForm] = useState<Form>(EMPTY);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  const account = useQuery({
    queryKey: ["account"],
    queryFn: () => fetchAccount(),
    enabled: signedIn,
  });

  // Prefill from the shopper's default address once.
  useEffect(() => {
    if (!account.data) return;
    const address = account.data.addresses.find((a) => a.is_default) ?? account.data.addresses[0];
    setForm((current) => {
      if (current.name || current.phone) return current;
      return {
        ...current,
        name: address?.full_name ?? account.data.profile?.full_name ?? "",
        phone: address?.phone ?? account.data.profile?.phone ?? "",
        email: session?.user.email ?? "",
        city: address?.city ?? current.city,
        area: address?.area ?? "",
        street: address?.street ?? "",
        building_number: address?.building_number ?? "",
        apartment_number: address?.apartment_number ?? "",
        delivery_instructions: address?.delivery_instructions ?? "",
      };
    });
  }, [account.data, session]);

  useEffect(() => {
    if (!methodId && methods?.[0]) setMethodId(methods[0].id);
  }, [methods, methodId]);

  const method = methods?.find((m) => m.id === methodId) ?? methods?.[0];
  const discount = coupon && !coupon.free_shipping ? Math.min(coupon.discount, subtotal) : 0;
  const afterDiscount = subtotal - discount;
  const shippingFee = useMemo(() => {
    if (!method) return 0;
    if (coupon?.free_shipping) return 0;
    if (method.free_over != null && afterDiscount >= Number(method.free_over)) return 0;
    if (method.free_over == null && afterDiscount >= Number(settings.free_shipping_over)) return 0;
    return Number(method.fee);
  }, [method, coupon, afterDiscount, settings.free_shipping_over]);
  const tax = Math.round(afterDiscount * Number(settings.tax_rate) ) / 100;
  const total = afterDiscount + shippingFee + tax;

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    const result = await checkCoupon({ data: { code, subtotal } });
    if (!result) {
      setCoupon(null);
      toast.error("That code can't be used on this basket.");
      return;
    }
    setCoupon(result);
    toast.success(`Code ${result.code} applied`);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.phone.trim() || !form.city.trim()) {
      setError("Please add your name, phone number and city.");
      return;
    }
    if (!/^[+\d][\d\s-]{6,}$/.test(form.phone.trim())) {
      setError("Please enter a valid phone number.");
      return;
    }
    setBusy(true);
    try {
      const result = await submit({
        data: {
          items,
          customer: form,
          shipping_method_id: method?.id ?? null,
          coupon_code: coupon?.code ?? null,
        },
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPlaced(result.order);
      clear();
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      window.scrollTo({ top: 0 });
    } catch {
      setError("We could not place the order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (placed) return <OrderConfirmation order={placed} />;

  return (
    <>
      <PageHeader title="Checkout" crumbs={[{ label: "Basket", to: "/cart" }, { label: "Checkout" }]} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <p className="py-16 text-center text-muted-foreground">Loading your basket…</p>
        ) : lines.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg font-medium">Your basket is empty</p>
            <Button asChild className="mt-4">
              <Link to="/shop">Go shopping</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-8">
              {!signedIn ? (
                <p className="rounded-xl bg-surface px-4 py-3 text-sm">
                  Have an account?{" "}
                  <Link to="/auth" search={{ redirect: "/checkout" }} className="font-medium text-primary underline">
                    Sign in
                  </Link>{" "}
                  to use your saved address and track orders. Or continue as a guest.
                </p>
              ) : null}

              <section>
                <h2 className="mb-4 text-xl font-semibold">Contact</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name *" id="name">
                    <Input id="name" value={form.name} onChange={set("name")} required autoComplete="name" />
                  </Field>
                  <Field label="Phone number *" id="phone">
                    <Input id="phone" value={form.phone} onChange={set("phone")} required autoComplete="tel" placeholder="+974 5555 1234" />
                  </Field>
                  <Field label="Email (for your receipt)" id="email" className="sm:col-span-2">
                    <Input id="email" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
                  </Field>
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-xl font-semibold">Delivery address</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="City *" id="city">
                    <Select value={form.city} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}>
                      <SelectTrigger id="city">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QATAR_CITIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Area / zone" id="area">
                    <Input id="area" value={form.area} onChange={set("area")} placeholder="e.g. Al Sadd, Zone 38" />
                  </Field>
                  <Field label="Street" id="street">
                    <Input id="street" value={form.street} onChange={set("street")} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Building" id="building">
                      <Input id="building" value={form.building_number} onChange={set("building_number")} />
                    </Field>
                    <Field label="Apartment" id="apartment">
                      <Input id="apartment" value={form.apartment_number} onChange={set("apartment_number")} />
                    </Field>
                  </div>
                  <Field label="Delivery notes" id="notes" className="sm:col-span-2">
                    <Textarea id="notes" rows={2} value={form.delivery_instructions} onChange={set("delivery_instructions")} placeholder="Landmark, gate code, best time to call…" />
                  </Field>
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-xl font-semibold">Delivery option</h2>
                <RadioGroup value={method?.id ?? ""} onValueChange={setMethodId} className="gap-3">
                  {(methods ?? []).map((m) => (
                    <Label
                      key={m.id}
                      htmlFor={`m-${m.id}`}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 font-normal",
                        m.id === method?.id ? "border-primary bg-secondary/50" : "border-border",
                      )}
                    >
                      <RadioGroupItem id={`m-${m.id}`} value={m.id} className="mt-0.5" />
                      <span className="flex-1">
                        <span className="block font-medium">{m.name}</span>
                        <span className="block text-sm text-muted-foreground">{m.description}</span>
                      </span>
                      <span className="text-sm font-semibold">
                        {Number(m.fee) === 0 ? "Free" : formatMoney(Number(m.fee))}
                        {m.free_over != null ? (
                          <span className="block text-xs font-normal text-muted-foreground">Free over {Number(m.free_over).toFixed(0)}</span>
                        ) : null}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </section>

              <section>
                <h2 className="mb-4 text-xl font-semibold">Payment</h2>
                <div className="flex items-center gap-3 rounded-xl border border-primary bg-secondary/50 p-4">
                  <Banknote className="size-5 text-primary" />
                  <div>
                    <p className="font-medium">Cash on delivery</p>
                    <p className="text-sm text-muted-foreground">Pay in cash or by card to the driver when your order arrives.</p>
                  </div>
                </div>
              </section>
            </div>

            <aside className="h-fit space-y-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-40">
              <h2 className="text-lg font-semibold">Order summary</h2>
              <ul className="max-h-64 space-y-3 overflow-y-auto">
                {lines.map((line) => (
                  <li key={`${line.product_id}-${line.variant_id}`} className="flex items-center gap-3 text-sm">
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-background">
                      {line.image_url ? <img src={line.image_url} alt="" className="size-full object-cover" /> : null}
                      <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {line.qty}
                      </span>
                    </span>
                    <span className="flex-1">
                      <span className="line-clamp-1">{line.name}</span>
                      {line.unit_label ? <span className="text-xs text-muted-foreground">{line.unit_label}</span> : null}
                    </span>
                    <span className="font-medium">{formatMoney(line.unit_price * line.qty)}</span>
                  </li>
                ))}
              </ul>

              <div className="flex gap-2">
                <Input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Discount code"
                  aria-label="Discount code"
                />
                <Button type="button" variant="outline" onClick={() => void applyCoupon()}>
                  <Tag /> Apply
                </Button>
              </div>
              {coupon ? (
                <p className="flex items-center justify-between text-xs text-success">
                  Code {coupon.code} applied
                  <button type="button" className="underline" onClick={() => setCoupon(null)}>
                    Remove
                  </button>
                </p>
              ) : null}

              <dl className="space-y-2 border-t border-border pt-4 text-sm">
                <Row label="Subtotal" value={formatMoney(subtotal)} />
                {discount > 0 ? <Row label="Discount" value={`− ${formatMoney(discount)}`} className="text-success" /> : null}
                <Row label={`Delivery${method ? ` · ${method.name}` : ""}`} value={shippingFee === 0 ? "Free" : formatMoney(shippingFee)} />
                {tax > 0 ? <Row label="Tax" value={formatMoney(tax)} /> : null}
                <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{formatMoney(total)}</dd>
                </div>
              </dl>

              {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

              <Button type="submit" size="lg" className="w-full rounded-full" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                Place order · {formatMoney(total)}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Prices and stock are checked again when you place the order.</p>
            </aside>
          </form>
        )}
      </div>
    </>
  );
}

function Field({ label, id, className, children }: { label: string; id: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex justify-between gap-3", className)}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function OrderConfirmation({ order }: { order: PlacedOrder }) {
  const days =
    order.delivery_days.max === 0
      ? "today"
      : order.delivery_days.min === order.delivery_days.max
        ? `in ${order.delivery_days.max} day${order.delivery_days.max > 1 ? "s" : ""}`
        : `in ${order.delivery_days.min}–${order.delivery_days.max} days`;
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rise-in rounded-3xl border border-border bg-card p-6 text-center sm:p-10">
        <CheckCircle2 className="mx-auto size-14 text-success" />
        <h1 className="mt-4 text-3xl font-semibold">Thank you, {order.customer_name.split(" ")[0]}!</h1>
        <p className="mt-2 text-muted-foreground">
          Your order is in. We'll call {order.phone} to confirm, and it should reach you {days}.
        </p>
        <p className="mt-6 inline-block rounded-xl bg-surface px-5 py-3 font-mono text-lg font-semibold" data-testid="order-number">
          {order.order_number}
        </p>
        <ul className="mt-8 space-y-2 text-left text-sm">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                {item.qty} × {item.name}
                {item.unit_label ? <span className="text-muted-foreground"> · {item.unit_label}</span> : null}
              </span>
              <span>{formatMoney(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-border pt-4 text-left text-sm">
          <Row label="Subtotal" value={formatMoney(order.subtotal)} />
          {order.discount > 0 ? <Row label="Discount" value={`− ${formatMoney(order.discount)}`} /> : null}
          <Row label={`Delivery · ${order.shipping_method}`} value={order.shipping_fee === 0 ? "Free" : formatMoney(order.shipping_fee)} />
          <div className="flex justify-between pt-2 text-base font-semibold">
            <dt>Total (cash on delivery)</dt>
            <dd>{formatMoney(order.total)}</dd>
          </div>
        </dl>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/track-order" search={{ order: order.order_number, phone: order.phone }}>
              Track this order
            </Link>
          </Button>
          <Button asChild>
            <Link to="/shop">Keep shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
