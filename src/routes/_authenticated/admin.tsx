import { Link, Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { Boxes, LayoutDashboard, Mail, MessageSquareText, Package, Settings, Tags } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.rpc("is_admin");
    if (data !== true) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Store admin | AmarBazar" },
      { name: "description", content: "Manage AmarBazar orders, products, reviews and store settings." },
      { property: "og:title", content: "Store admin | AmarBazar" },
      { property: "og:description", content: "AmarBazar store management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: Package, exact: false },
  { to: "/admin/products", label: "Products", icon: Boxes, exact: false },
  { to: "/admin/reviews", label: "Reviews", icon: MessageSquareText, exact: false },
  { to: "/admin/catalogue", label: "Catalogue", icon: Tags, exact: false },
  { to: "/admin/subscribers", label: "Subscribers", icon: Mail, exact: false },
  { to: "/admin/settings", label: "Settings", icon: Settings, exact: false },
] as const;

function AdminLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
        <nav className="flex gap-1 overflow-x-auto hide-scrollbar lg:sticky lg:top-40 lg:h-fit lg:flex-col">
          <p className="hidden px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:block">Store admin</p>
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-secondary font-medium text-secondary-foreground" }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
