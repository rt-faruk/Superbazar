import { createFileRoute } from "@tanstack/react-router";

import { InfoPage, infoHead } from "@/components/info/info-page";

export const Route = createFileRoute("/terms-of-service")({
  head: () => infoHead("Terms of service", "The terms that apply when you shop with AmarBazar."),
  component: () => (
    <InfoPage
      title="Terms of service"
      description="Last updated November 2026."
      sections={[
        {
          heading: "Orders",
          body: (
            <p>
              Placing an order is an offer to buy. We confirm every order by phone before dispatch, and may cancel an order if an item is
              out of stock or a price was shown in error — you won't be charged in that case.
            </p>
          ),
        },
        {
          heading: "Prices and payment",
          body: <p>Prices are in Qatari Riyal and are checked again when you place your order. Payment is collected on delivery.</p>,
        },
        {
          heading: "Delivery",
          body: <p>Delivery times are estimates. We'll keep you updated if anything changes.</p>,
        },
        {
          heading: "Your account",
          body: <p>Keep your password private. You're responsible for orders placed from your account.</p>,
        },
      ]}
    />
  ),
});
