import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminTitle, EmptyRow, Panel } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminDeleteProduct } from "@/lib/admin.functions";
import { adminProductsQuery } from "@/lib/admin-queries";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/products/")({
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const remove = useServerFn(adminDeleteProduct);
  const { data: products = [], isLoading } = useQuery(adminProductsQuery(search));

  async function onDelete(id: string, name: string) {
    if (!window.confirm(`Delete “${name}”? This can't be undone.`)) return;
    const result = await remove({ data: { id } });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Product deleted");
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <>
      <AdminTitle
        title="Products"
        description={`${products.length} product${products.length === 1 ? "" : "s"}`}
        actions={
          <Button asChild>
            <Link to="/admin/products/$id" params={{ id: "new" }}><Plus /> New product</Link>
          </Button>
        }
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(term.trim());
        }}
        className="relative mb-4 max-w-md"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search by name or SKU" className="pl-9" />
      </form>
      <Panel className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3">Shown as</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <EmptyRow colSpan={6}>Loading products…</EmptyRow>
            ) : products.length === 0 ? (
              <EmptyRow colSpan={6}>No products match.</EmptyRow>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link to="/admin/products/$id" params={{ id: product.id }} className="flex items-center gap-3 hover:text-primary">
                      <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                        {product.image_url ? <img src={product.image_url} alt="" className="size-full object-cover" /> : null}
                      </span>
                      <span>
                        <span className="font-medium">{product.name}</span>
                        <span className="block text-xs text-muted-foreground">{product.sku ?? "—"}{product.brand_name ? ` · ${product.brand_name}` : ""}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{product.category_name ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {formatMoney(product.price)}
                    {product.compare_at_price ? <span className="block text-xs text-muted-foreground line-through">{formatMoney(product.compare_at_price)}</span> : null}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${product.stock_quantity <= 0 ? "text-destructive" : product.stock_quantity <= 10 ? "text-harvest-foreground" : ""}`}>
                    {product.stock_quantity}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1">
                      {!product.is_active ? <Tag>Hidden</Tag> : null}
                      {product.is_featured ? <Tag>Featured</Tag> : null}
                      {product.is_flash_sale ? <Tag>Flash sale</Tag> : null}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" aria-label={`Delete ${product.name}`} onClick={() => void onDelete(product.id, product.name)}>
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">{children}</span>;
}
