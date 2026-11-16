import { Link } from "@tanstack/react-router";
import { Heart, LogOut, MapPin, Package, User } from "lucide-react";
import type { ReactNode } from "react";

import { useSiteData } from "@/components/layout/site-data";
import { signOut } from "@/lib/auth-actions";

const LINKS = [
  { to: "/account", label: "Overview", icon: User, exact: true },
  { to: "/account/orders", label: "My orders", icon: Package, exact: false },
  { to: "/account/addresses", label: "Addresses", icon: MapPin, exact: false },
  { to: "/wishlist", label: "Wishlist", icon: Heart, exact: false },
] as const;

export function AccountShell({ title, children }: { title: string; children: ReactNode }) {
  const { session } = useSiteData();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <p className="text-sm text-muted-foreground">{session?.user.email}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto hide-scrollbar lg:flex-col">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.exact }}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-secondary font-medium text-secondary-foreground" }}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "delivered"
      ? "bg-success/15 text-success"
      : status === "cancelled"
        ? "bg-destructive/10 text-destructive"
        : status === "pending"
          ? "bg-harvest/20 text-harvest-foreground"
          : "bg-secondary text-secondary-foreground";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${tone}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
