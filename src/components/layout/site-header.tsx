import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Heart,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/components/cart/cart-provider";
import { useSiteData } from "./site-data";
import { signOut } from "@/lib/auth-actions";
import { useIsAdmin } from "@/hooks/use-is-admin";

export function SiteHeader() {
  const { settings, categories, session, signedIn } = useSiteData();
  const { count } = useCart();
  const isAdmin = useIsAdmin();
  const [term, setTerm] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const topCategories = categories.filter((category) => !category.parent_id).slice(0, 10);

  function runSearch(event: React.FormEvent) {
    event.preventDefault();
    const value = term.trim();
    void navigate({ to: "/shop", search: value ? { search: value } : {} });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      {settings.announcement ? (
        <div className="bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium">
            <Sparkles className="size-3.5 shrink-0" />
            <span>{settings.announcement}</span>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">{settings.site_name}</SheetTitle>
            </SheetHeader>
            <nav className="mt-4 flex flex-col gap-1 pb-6">
              <Link
                to="/shop"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                All products
              </Link>
              <Link
                to="/shop"
                search={{ flashSaleOnly: true }}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-harvest-foreground hover:bg-accent"
              >
                Flash sale
              </Link>
              <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Departments
              </p>
              {topCategories.map((category) => (
                <Link
                  key={category.id}
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm hover:bg-accent"
                >
                  {category.name}
                </Link>
              ))}
              <div className="my-2 border-t border-border" />
              {signedIn ? (
                <>
                  <Link to="/account" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-accent">
                    My account
                  </Link>
                  <Link to="/wishlist" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-accent">
                    Wishlist
                  </Link>
                  {isAdmin ? (
                    <Link to="/admin" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-accent">
                      Store admin
                    </Link>
                  ) : null}
                </>
              ) : (
                <Link to="/auth" search={{ redirect: undefined }} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-accent">
                  Sign in or create an account
                </Link>
              )}
              <Link to="/track-order" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-accent">
                Track your order
              </Link>
              <Link to="/faq" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-accent">
                FAQs
              </Link>
              <Link to="/contact" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-accent">
                Contact us
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <LayoutGrid className="size-5" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {settings.site_name}
          </span>
        </Link>

        <form onSubmit={runSearch} className="relative ml-auto hidden max-w-xl flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search honey, rice, spices…"
            aria-label="Search products"
            className="rounded-full bg-surface pl-9"
          />
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link to="/wishlist" aria-label="Wishlist" className="hidden sm:block">
            <Button variant="ghost" size="icon" aria-label="Wishlist">
              <Heart className="size-5" />
            </Button>
          </Link>

          {signedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account">
                  <User className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  {session?.user.email ?? "Your account"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account">My account</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/orders">My orders</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/addresses">Addresses</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/wishlist">Wishlist</Link>
                </DropdownMenuItem>
                {isAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">Store admin</Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/auth" search={{ redirect: undefined }}>
                Sign in
              </Link>
            </Button>
          )}

          <Link to="/cart" aria-label="Basket" className="relative">
            <Button variant="ghost" size="icon" aria-label="Basket">
              <ShoppingBag className="size-5" />
            </Button>
            {count > 0 ? (
              <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-harvest px-1 text-[11px] font-bold text-harvest-foreground">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      <form onSubmit={runSearch} className="relative px-4 pb-3 md:hidden">
        <Search className="pointer-events-none absolute left-7 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
          className="rounded-full bg-surface pl-9"
        />
      </form>

      <nav className="hidden border-t border-border lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5 hide-scrollbar">
          <Link
            to="/shop"
            className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            All products
          </Link>
          <Link
            to="/shop"
            search={{ flashSaleOnly: true }}
            className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-harvest-foreground transition-colors hover:bg-accent"
          >
            Flash sale
          </Link>
          {topCategories.map((category) => (
            <Link
              key={category.id}
              to="/category/$slug"
              params={{ slug: category.slug }}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {category.name}
            </Link>
          ))}
          <span className="ml-auto flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-xs text-muted-foreground">
            <Package className="size-3.5" />
            Delivery across Qatar
          </span>
        </div>
      </nav>
    </header>
  );
}
