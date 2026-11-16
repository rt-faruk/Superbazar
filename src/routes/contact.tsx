import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { useSiteData } from "@/components/layout/site-data";
import { Button } from "@/components/ui/button";
import { infoHead } from "@/components/info/info-page";

export const Route = createFileRoute("/contact")({
  head: () => infoHead("Contact us", "Call, WhatsApp or email the AmarBazar team about orders, deliveries and products."),
  component: ContactPage,
});

function ContactPage() {
  const { settings } = useSiteData();
  const cards = [
    settings.whatsapp_number
      ? { icon: MessageCircle, label: "WhatsApp", value: "Fastest reply", href: `https://wa.me/${settings.whatsapp_number}` }
      : null,
    settings.contact_phone ? { icon: Phone, label: "Call us", value: settings.contact_phone, href: `tel:${settings.contact_phone}` } : null,
    settings.contact_email ? { icon: Mail, label: "Email", value: settings.contact_email, href: `mailto:${settings.contact_email}` } : null,
  ].filter((card): card is NonNullable<typeof card> => card !== null);

  return (
    <>
      <PageHeader title="Contact us" description="Questions about an order, a product or a delivery? We're happy to help." crumbs={[{ label: "Contact" }]} />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map((card) => (
            <a key={card.label} href={card.href} target={card.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="card-lift rounded-2xl border border-border bg-card p-5">
              <card.icon className="size-6 text-primary" />
              <p className="mt-3 font-semibold">{card.label}</p>
              <p className="text-sm text-muted-foreground">{card.value}</p>
            </a>
          ))}
        </div>
        <div className="mt-8 grid gap-4 rounded-2xl border border-border bg-surface p-6 sm:grid-cols-2">
          {settings.address ? (
            <p className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <span className="block font-medium">Our store</span>
                <span className="text-sm text-muted-foreground">{settings.address}</span>
              </span>
            </p>
          ) : null}
          <p className="flex items-start gap-3">
            <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>
              <span className="block font-medium">Opening hours</span>
              <span className="text-sm text-muted-foreground">Every day, 9am – 10pm</span>
            </span>
          </p>
        </div>
        {settings.whatsapp_number ? (
          <div className="mt-8 text-center">
            <Button asChild size="lg" className="rounded-full">
              <a href={`https://wa.me/${settings.whatsapp_number}`} target="_blank" rel="noreferrer">
                <MessageCircle /> Start a WhatsApp chat
              </a>
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
