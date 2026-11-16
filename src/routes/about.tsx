import { createFileRoute, Link } from "@tanstack/react-router";

import { HelpAside } from "@/components/info/help-aside";
import { InfoPage, infoHead } from "@/components/info/info-page";

export const Route = createFileRoute("/about")({
  head: () => infoHead("About AmarBazar", "AmarBazar brings honey, dates, spices, rice and pantry staples to homes across Qatar."),
  component: () => (
    <InfoPage
      title="About AmarBazar"
      description="A neighbourhood grocer, delivered across Qatar."
      aside={<HelpAside />}
      sections={[
        {
          heading: "Why we started",
          body: (
            <p>
              AmarBazar began with a simple frustration: the honey, dates, ghee and spices we grew up with were hard to find in
              good condition, and harder to trust. So we built a shop that stocks fewer things, checks every batch by hand and
              delivers them fresh to your door.
            </p>
          ),
        },
        {
          heading: "What we stock",
          body: (
            <p>
              Raw honey, premium dates, cold-pressed oils, ghee, whole and ground spices, aged rice, lentils, tea and coffee,
              organic grains and the everyday essentials that keep a kitchen running. <Link to="/shop" className="text-primary underline">Browse the full range</Link>.
            </p>
          ),
        },
        {
          heading: "How we work",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Small batches, restocked weekly, so nothing sits on a shelf for long.</li>
              <li>Every order packed and sealed by hand in Doha.</li>
              <li>Cash on delivery — pay only when your groceries arrive.</li>
            </ul>
          ),
        },
      ]}
    />
  ),
});
