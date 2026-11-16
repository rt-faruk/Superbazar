import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, Music2, Phone, Truck } from "lucide-react";

import { useSiteData } from "./site-data";

const HELP_LINKS = [
  { to: "/shipping-policy", label: "Delivery & payment" },
  { to: "/returns-policy", label: "Returns & refunds" },
  { to: "/faq", label: "FAQs" },
  { to: "/track-order", label: "Track your order" },
];

const ABOUT_LINKS = [
  { to: "/about", label: "About AmarBazar" },
  { to: "/contact", label: "Contact us" },
  { to: "/privacy-policy", label: "Privacy policy" },
  { to: "/terms-of-service", label: "Terms of service" },
];

export function SiteFooter() {
  const { settings, categories } = useSiteData();
  const socials = (settings.social_links ?? {}) as Record<string, string>;

  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl font-semibold text-foreground">
            {settings.site_name}
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">{settings.tagline}</p>
          <div className="mt-4 flex gap-2">
            {socials["instagram"] ? (
              <a
                href={socials["instagram"]}
                aria-label="Instagram"
                className="rounded-full border border-border bg-background p-2 text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Instagram className="size-4" />
              </a>
            ) : null}
            {socials["facebook"] ? (
              <a
                href={socials["facebook"]}
                aria-label="Facebook"
                className="rounded-full border border-border bg-background p-2 text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Facebook className="size-4" />
              </a>
            ) : null}
            {socials["tiktok"] ? (
              <a
                href={socials["tiktok"]}
                aria-label="TikTok"
                className="rounded-full border border-border bg-background p-2 text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Music2 className="size-4" />
              </a>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-foreground">Shop</p>
          <ul className="mt-3 space-y-2 text-sm">
            {categories.slice(0, 6).map((category) => (
              <li key={category.id}>
                <Link
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {category.name}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/shop" className="text-muted-foreground transition-colors hover:text-primary">
                All products
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-foreground">Help</p>
          <ul className="mt-3 space-y-2 text-sm">
            {HELP_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-muted-foreground transition-colors hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-3 space-y-2 text-sm">
            {ABOUT_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-muted-foreground transition-colors hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
            Get in touch
          </p>
          <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
            {settings.contact_phone ? (
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                <a href={`tel:${settings.contact_phone}`} className="hover:text-primary">
                  {settings.contact_phone}
                </a>
              </li>
            ) : null}
            {settings.whatsapp_number ? (
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                <a
                  href={`https://wa.me/${settings.whatsapp_number}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-primary"
                >
                  WhatsApp us
                </a>
              </li>
            ) : null}
            {settings.contact_email ? (
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
                <a href={`mailto:${settings.contact_email}`} className="hover:text-primary">
                  {settings.contact_email}
                </a>
              </li>
            ) : null}
            {settings.address ? (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{settings.address}</span>
              </li>
            ) : null}
          </ul>
          <p className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            <Truck className="size-4 text-primary" />
            Free delivery over {settings.currency_symbol} {Number(settings.free_shipping_over).toFixed(0)}
          </p>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.site_name}. All rights reserved.
          </p>
          <p>Cash on delivery and card payments accepted across Qatar.</p>
        </div>
      </div>
    </footer>
  );
}
