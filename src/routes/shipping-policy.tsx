import { createFileRoute } from "@tanstack/react-router";

import { HelpAside } from "@/components/info/help-aside";
import { InfoPage, infoHead } from "@/components/info/info-page";
import { useSiteData } from "@/components/layout/site-data";

export const Route = createFileRoute("/shipping-policy")({
  head: () => infoHead("Delivery & payment", "AmarBazar delivery areas, times, fees and cash-on-delivery payment across Qatar."),
  component: ShippingPolicy,
});

function ShippingPolicy() {
  const { settings } = useSiteData();
  const symbol = settings.currency_symbol;
  return (
    <InfoPage
      title="Delivery & payment"
      description="How and when your groceries reach you."
      aside={<HelpAside />}
      sections={[
        {
          heading: "Delivery options",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Standard delivery — Doha and Al Rayyan, 1–2 working days.</li>
              <li>Express same-day — order before 12pm for delivery today in Doha.</li>
              <li>Outside Doha — Al Khor, Al Wakrah and the north, 2–3 working days.</li>
            </ul>
          ),
        },
        {
          heading: "Delivery fees",
          body: (
            <p>
              Delivery starts from {symbol} {Number(settings.default_shipping_fee).toFixed(0)} and is free on orders over {symbol}{" "}
              {Number(settings.free_shipping_over).toFixed(0)} for standard delivery. The exact fee for your address is shown at checkout
              before you place the order.
            </p>
          ),
        },
        {
          heading: "Payment",
          body: (
            <p>
              We accept cash on delivery. Pay the driver in cash or by card when your order arrives. We'll call the phone number on your
              order to confirm before dispatch.
            </p>
          ),
        },
        {
          heading: "If you miss the delivery",
          body: <p>The driver will call you on arrival. If we can't reach you, we'll arrange a new time at no extra charge.</p>,
        },
      ]}
    />
  );
}
