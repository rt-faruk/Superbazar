import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminTitle, Panel } from "@/components/admin/admin-ui";
import { ImageUploadButton } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminSaveProduct, type AdminProductDetail, type ProductForm } from "@/lib/admin.functions";
import { adminLookupQuery, adminProductQuery } from "@/lib/admin-queries";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/products/$id")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminLookupQuery()),
      params.id === "new" ? null : context.queryClient.ensureQueryData(adminProductQuery(params.id)),
    ]),
  component: ProductEditor,
});

type Draft = {
  name: string;
  slug: string;
  short_description: string;
  description: string;
  category_id: string;
  brand_id: string;
  sku: string;
  unit_label: string;
  price: string;
  compare_at_price: string;
  stock_quantity: string;
  low_stock_threshold: string;
  is_active: boolean;
  is_featured: boolean;
  is_organic: boolean;
  is_flash_sale: boolean;
  flash_sale_price: string;
  flash_sale_ends_at: string;
  ingredients: string;
  tags: string;
  images: Array<{ url: string; alt: string }>;
};

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toDraft(detail: AdminProductDetail | null): Draft {
  const p = detail?.product;
  const images = detail?.images.length
    ? detail.images.map((image) => ({ url: image.url, alt: image.alt ?? "" }))
    : p?.image_url
      ? [{ url: p.image_url, alt: "" }]
      : [];
  return {
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    short_description: p?.short_description ?? "",
    description: p?.description ?? "",
    category_id: p?.category_id ?? "",
    brand_id: p?.brand_id ?? "",
    sku: p?.sku ?? "",
    unit_label: p?.unit_label ?? "",
    price: p ? String(p.price) : "",
    compare_at_price: p?.compare_at_price != null ? String(p.compare_at_price) : "",
    stock_quantity: p ? String(p.stock_quantity) : "0",
    low_stock_threshold: p ? String(p.low_stock_threshold) : "10",
    is_active: p?.is_active ?? true,
    is_featured: p?.is_featured ?? false,
    is_organic: p?.is_organic ?? false,
    is_flash_sale: p?.is_flash_sale ?? false,
    flash_sale_price: p?.flash_sale_price != null ? String(p.flash_sale_price) : "",
    flash_sale_ends_at: toLocalInput(p?.flash_sale_ends_at ?? null),
    ingredients: p?.ingredients ?? "",
    tags: (p?.tags ?? []).join(", "),
    images,
  };
}

const NONE = "__none";

function ProductEditor() {
  const { id } = Route.useParams();
  return id === "new" ? <EditorForm key="new" id={id} detail={null} /> : <ExistingProduct key={id} id={id} />;
}

function ExistingProduct({ id }: { id: string }) {
  const { data: detail } = useSuspenseQuery(adminProductQuery(id));
  if (!detail) {
    return (
      <div className="py-16 text-center">
        <p className="font-medium">Product not found</p>
        <Link to="/admin/products" className="text-sm text-primary underline">Back to products</Link>
      </div>
    );
  }
  return <EditorForm id={id} detail={detail} />;
}

function EditorForm({ id, detail }: { id: string; detail: AdminProductDetail | null }) {
  const isNew = id === "new";
  const { data: lookup } = useSuspenseQuery(adminLookupQuery());
  const [draft, setDraft] = useState<Draft>(() => toDraft(detail));
  const [busy, setBusy] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const save = useServerFn(adminSaveProduct);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const set = (key: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((current) => ({ ...current, [key]: event.target.value }));
  const toggle = (key: "is_active" | "is_featured" | "is_organic" | "is_flash_sale") => (value: boolean) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const addImage = (url: string) => setDraft((current) => ({ ...current, images: [...current.images, { url, alt: "" }] }));
  const num = (value: string) => (value.trim() === "" ? null : Number(value));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const images = draft.images.filter((image) => image.url.trim());
    const payload: ProductForm = {
      ...(isNew ? {} : { id }),
      name: draft.name,
      slug: draft.slug || slugify(draft.name),
      short_description: draft.short_description,
      description: draft.description,
      category_id: draft.category_id || null,
      brand_id: draft.brand_id || null,
      sku: draft.sku,
      unit_label: draft.unit_label,
      price: Number(draft.price),
      compare_at_price: num(draft.compare_at_price),
      stock_quantity: Number(draft.stock_quantity) || 0,
      low_stock_threshold: Number(draft.low_stock_threshold) || 0,
      is_active: draft.is_active,
      is_featured: draft.is_featured,
      is_organic: draft.is_organic,
      is_flash_sale: draft.is_flash_sale,
      flash_sale_price: draft.is_flash_sale ? num(draft.flash_sale_price) : null,
      flash_sale_ends_at: draft.is_flash_sale && draft.flash_sale_ends_at ? new Date(draft.flash_sale_ends_at).toISOString() : null,
      ingredients: draft.ingredients,
      tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      image_url: images[0]?.url ?? null,
      images,
    };
    setBusy(true);
    try {
      const result = await save({ data: payload });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(isNew ? "Product created" : "Product saved");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["product"] });
      if (isNew) void navigate({ to: "/admin/products/$id", params: { id: result.id }, replace: true });
    } catch {
      toast.error("Could not save this product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link to="/admin/products" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> All products
      </Link>
      <AdminTitle
        title={isNew ? "New product" : draft.name || "Edit product"}
        actions={
          !isNew && detail ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/product/$slug" params={{ slug: detail.product.slug }}>View in shop</Link>
            </Button>
          ) : null
        }
      />
      <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Panel title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name *" id="p-name" className="sm:col-span-2">
                <Input id="p-name" required value={draft.name} onChange={set("name")} />
              </Field>
              <Field label="Page link" id="p-slug">
                <Input id="p-slug" value={draft.slug} onChange={set("slug")} placeholder={slugify(draft.name) || "made-from-the-name"} />
              </Field>
              <Field label="SKU" id="p-sku">
                <Input id="p-sku" value={draft.sku} onChange={set("sku")} />
              </Field>
              <Field label="Short description" id="p-short" className="sm:col-span-2">
                <Input id="p-short" value={draft.short_description} onChange={set("short_description")} />
              </Field>
              <Field label="Full description" id="p-desc" className="sm:col-span-2">
                <Textarea id="p-desc" rows={5} value={draft.description} onChange={set("description")} />
              </Field>
              <Field label="Ingredients" id="p-ing" className="sm:col-span-2">
                <Input id="p-ing" value={draft.ingredients} onChange={set("ingredients")} />
              </Field>
              <Field label="Tags (comma separated)" id="p-tags" className="sm:col-span-2">
                <Input id="p-tags" value={draft.tags} onChange={set("tags")} placeholder="honey, raw, premium" />
              </Field>
            </div>
          </Panel>

          <Panel title="Photos">
            <p className="mb-3 text-xs text-muted-foreground">The first photo is the main one shown on product cards.</p>
            {draft.images.length === 0 ? <p className="mb-3 text-sm text-muted-foreground">No photos yet.</p> : null}
            <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {draft.images.map((image, index) => (
                <li key={`${image.url}-${index}`} className="relative overflow-hidden rounded-xl border border-border bg-surface">
                  <img src={image.url} alt="" className="aspect-square w-full object-cover" />
                  {index === 0 ? (
                    <span className="absolute left-1 top-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">Main</span>
                  ) : (
                    <button
                      type="button"
                      className="absolute left-1 top-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold"
                      onClick={() =>
                        setDraft((current) => {
                          const images = [...current.images];
                          const [picked] = images.splice(index, 1);
                          return picked ? { ...current, images: [picked, ...images] } : current;
                        })
                      }
                    >
                      Make main
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-background/90 text-destructive"
                    onClick={() => setDraft((current) => ({ ...current, images: current.images.filter((_, i) => i !== index) }))}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <ImageUploadButton onUploaded={addImage} />
              <span className="text-xs text-muted-foreground">or</span>
              <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Paste an image link" className="h-8 max-w-xs" />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (!/^(https?:\/\/|\/)/.test(newUrl.trim())) {
                    toast.error("Paste a full image link starting with https://");
                    return;
                  }
                  addImage(newUrl.trim());
                  setNewUrl("");
                }}
              >
                Add link
              </Button>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Price & stock">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Price (QAR) *" id="p-price">
                <Input id="p-price" type="number" step="0.01" min="0" required value={draft.price} onChange={set("price")} />
              </Field>
              <Field label="Was price" id="p-compare">
                <Input id="p-compare" type="number" step="0.01" min="0" value={draft.compare_at_price} onChange={set("compare_at_price")} />
              </Field>
              <Field label="In stock" id="p-stock">
                <Input id="p-stock" type="number" min="0" value={draft.stock_quantity} onChange={set("stock_quantity")} />
              </Field>
              <Field label="Low stock at" id="p-low">
                <Input id="p-low" type="number" min="0" value={draft.low_stock_threshold} onChange={set("low_stock_threshold")} />
              </Field>
              <Field label="Pack size" id="p-unit" className="col-span-2">
                <Input id="p-unit" value={draft.unit_label} onChange={set("unit_label")} placeholder="500 g" />
              </Field>
            </div>
          </Panel>

          <Panel title="Organise">
            <div className="space-y-4">
              <Field label="Category" id="p-cat">
                <Select value={draft.category_id || NONE} onValueChange={(v) => setDraft((d) => ({ ...d, category_id: v === NONE ? "" : v }))}>
                  <SelectTrigger id="p-cat"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No category</SelectItem>
                    {lookup.categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.parent_id ? "— " : ""}{category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Brand" id="p-brand">
                <Select value={draft.brand_id || NONE} onValueChange={(v) => setDraft((d) => ({ ...d, brand_id: v === NONE ? "" : v }))}>
                  <SelectTrigger id="p-brand"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No brand</SelectItem>
                    {lookup.brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Toggle label="Visible in the shop" checked={draft.is_active} onChange={toggle("is_active")} />
              <Toggle label="Featured on the homepage" checked={draft.is_featured} onChange={toggle("is_featured")} />
              <Toggle label="Organic" checked={draft.is_organic} onChange={toggle("is_organic")} />
              <Toggle label="Flash sale" checked={draft.is_flash_sale} onChange={toggle("is_flash_sale")} />
              {draft.is_flash_sale ? (
                <div className="grid gap-3 rounded-xl bg-surface p-3">
                  <Field label="Flash sale price" id="p-flash">
                    <Input id="p-flash" type="number" step="0.01" min="0" value={draft.flash_sale_price} onChange={set("flash_sale_price")} />
                  </Field>
                  <Field label="Sale ends" id="p-flash-end">
                    <Input id="p-flash-end" type="datetime-local" value={draft.flash_sale_ends_at} onChange={set("flash_sale_ends_at")} />
                  </Field>
                </div>
              ) : null}
            </div>
          </Panel>

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null} {isNew ? "Create product" : "Save changes"}
          </Button>
        </div>
      </form>
    </>
  );
}

function Field({ label, id, className, children }: { label: string; id: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
