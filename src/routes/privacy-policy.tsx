import { createFileRoute } from "@tanstack/react-router";

import { InfoPage, infoHead } from "@/components/info/info-page";

export const Route = createFileRoute("/privacy-policy")({
  head: () => infoHead("Privacy policy", "What personal information AmarBazar collects, why, and how it is protected."),
  component: () => (
    <InfoPage
      title="Privacy policy"
      description="Last updated November 2026."
      sections={[
        {
          heading: "What we collect",
          body: (
            <p>
              Your name, phone number, email and delivery address when you order or create an account, the items you order, and basic
              technical information needed to keep the site working.
            </p>
          ),
        },
        {
          heading: "How we use it",
          body: (
            <p>
              To deliver your orders, contact you about them, keep your account working and — only if you subscribe — send our
              newsletter. We never sell your information.
            </p>
          ),
        },
        {
          heading: "Who we share it with",
          body: <p>Only our delivery team and the service providers that host this website, and only what they need to do their job.</p>,
        },
        {
          heading: "Your choices",
          body: (
            <p>
              You can update your details in My account, unsubscribe from emails at any time, or ask us to delete your account by
              contacting us.
            </p>
          ),
        },
      ]}
    />
  ),
});
