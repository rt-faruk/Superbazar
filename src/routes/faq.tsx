import { createFileRoute, Link } from "@tanstack/react-router";

import { HelpAside } from "@/components/info/help-aside";
import { infoHead } from "@/components/info/info-page";
import { PageHeader } from "@/components/layout/page-header";
import { useSiteData } from "@/components/layout/site-data";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => infoHead("FAQs", "Answers about AmarBazar delivery times, fees, payment, returns and your account."),
  component: FaqPage,
});

function FaqPage() {
  const { settings } = useSiteData();
  const symbol = settings.currency_symbol;
  const faqs = [
    {
      q: "Where do you deliver?",
      a: "Across Qatar — Doha, Al Rayyan, Lusail, Al Wakrah, Al Khor, Umm Salal and more. You'll see the delivery options for your area at checkout.",
    },
    {
      q: "How much is delivery?",
      a: `Standard delivery is ${symbol} ${Number(settings.default_shipping_fee).toFixed(0)} and free on orders over ${symbol} ${Number(settings.free_shipping_over).toFixed(0)}. Express same-day delivery is available in Doha.`,
    },
    { q: "How do I pay?", a: "Cash on delivery. You pay the driver in cash or by card when your order arrives — nothing is charged online." },
    { q: "How long does delivery take?", a: "Most Doha orders arrive within 1–2 working days. Order before 12pm for express same-day delivery in Doha." },
    {
      q: "How do I track my order?",
      a: (
        <>
          Use the <Link to="/track-order" className="text-primary underline">track order</Link> page with your order number and phone
          number. If you're signed in, your orders are also under My account.
        </>
      ),
    },
    {
      q: "Can I return something?",
      a: (
        <>
          Yes — if an item arrives damaged, wrong or past its date, tell us within 48 hours. See our{" "}
          <Link to="/returns-policy" className="text-primary underline">returns policy</Link>.
        </>
      ),
    },
    { q: "Do I need an account to order?", a: "No. You can check out as a guest. An account lets you save addresses, keep a wishlist and see all your orders." },
    { q: "How do I use a discount code?", a: "Enter it in the order summary at checkout and tap Apply. The discount shows before you place the order." },
  ];

  return (
    <>
      <PageHeader title="Frequently asked questions" crumbs={[{ label: "FAQs" }]} />
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 lg:grid-cols-[1fr_280px]">
        <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-5">
          {faqs.map((faq) => (
            <AccordionItem key={faq.q} value={faq.q}>
              <AccordionTrigger className="text-left text-base">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <aside className="h-fit space-y-3 rounded-2xl border border-border bg-surface p-5 text-sm">
          <HelpAside />
        </aside>
      </div>
    </>
  );
}
