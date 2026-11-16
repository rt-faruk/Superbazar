import { Link } from "@tanstack/react-router";
import { MessageCircle, Phone } from "lucide-react";

import { useSiteData } from "@/components/layout/site-data";
import { Button } from "@/components/ui/button";

export function HelpAside() {
  const { settings } = useSiteData();
  return (
    <>
      <p className="font-semibold">Need a hand?</p>
      <p className="text-muted-foreground">Our team answers calls and WhatsApp messages every day, 9am–10pm.</p>
      {settings.whatsapp_number ? (
        <Button asChild className="w-full">
          <a href={`https://wa.me/${settings.whatsapp_number}`} target="_blank" rel="noreferrer">
            <MessageCircle /> WhatsApp us
          </a>
        </Button>
      ) : null}
      {settings.contact_phone ? (
        <Button asChild variant="outline" className="w-full">
          <a href={`tel:${settings.contact_phone}`}>
            <Phone /> {settings.contact_phone}
          </a>
        </Button>
      ) : null}
      <Link to="/track-order" className="block text-center text-primary hover:underline">
        Track an order
      </Link>
    </>
  );
}
