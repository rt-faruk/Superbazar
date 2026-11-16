import { createFileRoute } from "@tanstack/react-router";

import { HelpAside } from "@/components/info/help-aside";
import { InfoPage, infoHead } from "@/components/info/info-page";

export const Route = createFileRoute("/returns-policy")({
  head: () => infoHead("Returns & refunds", "How to return a damaged, wrong or out-of-date AmarBazar item and get a refund."),
  component: () => (
    <InfoPage
      title="Returns & refunds"
      description="If something isn't right, we'll make it right."
      aside={<HelpAside />}
      sections={[
        {
          heading: "What you can return",
          body: (
            <p>
              Items that arrive damaged, leaking, past their best-before date or different from what you ordered. Tell us within 48 hours
              of delivery with a photo of the item and your order number.
            </p>
          ),
        },
        {
          heading: "What we can't take back",
          body: <p>Opened food items that were delivered in good condition, and items returned after 48 hours.</p>,
        },
        {
          heading: "How refunds work",
          body: (
            <p>
              We'll replace the item on your next delivery or refund you in cash or by bank transfer within 5 working days — whichever you
              prefer.
            </p>
          ),
        },
      ]}
    />
  ),
});
