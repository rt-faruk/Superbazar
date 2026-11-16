import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminTitle, EmptyRow, Panel } from "@/components/admin/admin-ui";
import { ImageUploadButton } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { adminSimpleDelete, adminSimpleSave } from "@/lib/admin.functions";
import { adminListQuery, type SimpleTable } from "@/lib/admin-queries";
import { formatDate, slugify } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/catalogue")({
  component: CataloguePage,
});

type FieldType = "text" | "textarea" | "number" | "bool" | "datetime" | "image" | "select" | "parent";
type FieldDef = { key: string; label: string; type: FieldType; options?: Array<{ value: string; label: string }>; required?: boolean };
type Row = Record<string, unknown> & { id: string };

const CONFIG: Record<SimpleTable, { label: string; single: string; fields: FieldDef[]; columns: Array<{ key: string; label: string }> }> = {
  categories: {
    label: "Categories",
    single: "category",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "slug", label: "Page link", type: "text" },
      { key: "parent_id", label: "Inside department", type: "parent" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "image_url", label: "Photo", type: "image" },
      { key: "sort_order", label: "Order", type: "number" },
      { key: "is_active", label: "Visible", type: "bool" },
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Link" },
      { key: "sort_order", label: "Order" },
    ],
  },
  brands: {
    label: "Brands",
    single: "brand",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "slug", label: "Page link", type: "text" },
      { key: "logo_url", label: "Logo", type: "image" },
      { key: "sort_order", label: "Order", type: "number" },
      { key: "is_active", label: "Visible", type: "bool" },
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Link" },
      { key: "sort_order", label: "Order" },
    ],
  },
  banners: {
    label: "Banners",
    single: "banner",
    fields: [
      { key: "title", label: "Headline", type: "text", required: true },
      { key: "subtitle", label: "Sub-headline", type: "text" },
      { key: "image_url", label: "Photo", type: "image" },
      { key: "link_url", label: "Button goes to", type: "text" },
      { key: "cta_label", label: "Button text", type: "text" },
      { key: "position", label: "Where", type: "select", options: [{ value: "hero", label: "Homepage slider" }, { value: "promo", label: "Promo strip" }] },
      { key: "sort_order", label: "Order", type: "number" },
      { key: "starts_at", label: "Show from", type: "datetime" },
      { key: "ends_at", label: "Show until", type: "datetime" },
      { key: "is_active", label: "Live", type: "bool" },
    ],
    columns: [
      { key: "title", label: "Headline" },
      { key: "position", label: "Where" },
      { key: "sort_order", label: "Order" },
    ],
  },
  coupons: {
    label: "Coupons",
    single: "coupon",
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "kind", label: "Type", type: "select", options: [{ value: "percent", label: "% off" }, { value: "fixed", label: "QAR off" }, { value: "free_shipping", label: "Free delivery" }] },
      { key: "value", label: "Amount", type: "number" },
      { key: "min_subtotal", label: "Minimum basket (QAR)", type: "number" },
      { key: "max_discount", label: "Max discount (QAR)", type: "number" },
      { key: "usage_limit", label: "Usage limit", type: "number" },
      { key: "expires_at", label: "Expires", type: "datetime" },
      { key: "is_active", label: "Active", type: "bool" },
    ],
    columns: [
      { key: "code", label: "Code" },
      { key: "kind", label: "Type" },
      { key: "value", label: "Amount" },
      { key: "used_count", label: "Used" },
      { key: "expires_at", label: "Expires" },
    ],
  },
};

const DEFAULTS: Record<SimpleTable, Record<string, unknown>> = {
  categories: { is_active: true, sort_order: 0 },
  brands: { is_active: true, sort_order: 0 },
  banners: { is_active: true, sort_order: 0, position: "hero" },
  coupons: { is_active: true, kind: "percent", value: 10, min_subtotal: 0 },
};

function toLocal(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function CataloguePage() {
  const [table, setTable] = useState<SimpleTable>("categories");
  const [editing, setEditing] = useState<{ id?: string; values: Record<string, unknown> } | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: rows = [], isLoading } = useQuery(adminListQuery(table));
  const { data: categories = [] } = useQuery(adminListQuery("categories"));
  const save = useServerFn(adminSimpleSave);
  const remove = useServerFn(adminSimpleDelete);
  const queryClient = useQueryClient();
  const config = CONFIG[table];

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: [table === "banners" ? "banners" : table] });
  };

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const values: Record<string, unknown> = {};
    for (const field of config.fields) {
      const raw = editing.values[field.key];
      if (field.type === "bool") values[field.key] = raw === true;
      else if (field.type === "number") values[field.key] = raw === "" || raw == null ? null : Number(raw);
      else if (field.type === "datetime") values[field.key] = raw ? new Date(String(raw)).toISOString() : null;
      else values[field.key] = typeof raw === "string" ? raw.trim() || null : (raw ?? null);
    }
    if ("slug" in values && !values["slug"]) values["slug"] = slugify(String(values["name"] ?? ""));
    if (table === "coupons") values["code"] = String(values["code"] ?? "").toUpperCase();
    for (const key of ["sort_order", "value", "min_subtotal"]) if (key in values && values[key] == null) values[key] = 0;
    setBusy(true);
    try {
      const result = await save({ data: { table, id: editing.id, values } });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Saved ${config.single}`);
      setEditing(null);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  const display = (row: Row, key: string) => {
    const value = row[key];
    if (key.endsWith("_at")) return value ? formatDate(String(value)) : "—";
    if (value == null || value === "") return "—";
    return String(value);
  };

  return (
    <>
      <AdminTitle
        title="Catalogue"
        description="Departments, brands, homepage banners and discount codes."
        actions={
          <Button onClick={() => setEditing({ values: { ...DEFAULTS[table] } })}>
            <Plus /> New {config.single}
          </Button>
        }
      />
      <Tabs value={table} onValueChange={(value) => setTable(value as SimpleTable)} className="mb-4">
        <TabsList>
          {(Object.keys(CONFIG) as SimpleTable[]).map((key) => (
            <TabsTrigger key={key} value={key}>{CONFIG[key].label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Panel className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {config.columns.map((column) => <th key={column.key} className="px-4 py-3">{column.label}</th>)}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <EmptyRow colSpan={config.columns.length + 2}>Loading…</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={config.columns.length + 2}>Nothing here yet.</EmptyRow>
            ) : (
              (rows as Row[]).map((row) => (
                <tr key={row.id} className="hover:bg-surface">
                  {config.columns.map((column, index) => (
                    <td key={column.key} className={`px-4 py-3 ${index === 0 ? "font-medium" : "text-muted-foreground"}`}>
                      {display(row, column.key)}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row["is_active"] ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {row["is_active"] ? "On" : "Off"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing({ id: row.id, values: { ...row } })}>
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={async () => {
                        if (!window.confirm(`Delete this ${config.single}?`)) return;
                        const result = await remove({ data: { table, id: row.id } });
                        if (!result.ok) toast.error(result.message);
                        else {
                          toast.success("Deleted");
                          refresh();
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? `Edit ${config.single}` : `New ${config.single}`}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form onSubmit={onSave} className="space-y-4">
              {config.fields.map((field) => {
                const value = editing.values[field.key];
                const setValue = (next: unknown) => setEditing((current) => (current ? { ...current, values: { ...current.values, [field.key]: next } } : current));
                const id = `f-${field.key}`;
                if (field.type === "bool") {
                  return (
                    <label key={field.key} className="flex items-center justify-between text-sm">
                      {field.label}
                      <Switch checked={value === true} onCheckedChange={setValue} />
                    </label>
                  );
                }
                return (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={id}>{field.label}{field.required ? " *" : ""}</Label>
                    {field.type === "textarea" ? (
                      <Textarea id={id} rows={3} value={String(value ?? "")} onChange={(e) => setValue(e.target.value)} />
                    ) : field.type === "select" ? (
                      <Select value={String(value ?? field.options?.[0]?.value ?? "")} onValueChange={setValue}>
                        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : field.type === "parent" ? (
                      <Select value={String(value ?? "__top")} onValueChange={(next) => setValue(next === "__top" ? null : next)}>
                        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__top">Top-level department</SelectItem>
                          {(categories as Row[])
                            .filter((category) => !category["parent_id"] && category.id !== editing.id)
                            .map((category) => <SelectItem key={category.id} value={category.id}>{String(category["name"])}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : field.type === "image" ? (
                      <div className="flex items-center gap-2">
                        {value ? <img src={String(value)} alt="" className="size-10 shrink-0 rounded-lg object-cover" /> : null}
                        <Input id={id} value={String(value ?? "")} onChange={(e) => setValue(e.target.value)} placeholder="https://…" />
                        <ImageUploadButton label="Upload" onUploaded={setValue} />
                      </div>
                    ) : field.type === "datetime" ? (
                      <Input id={id} type="datetime-local" value={toLocal(value)} onChange={(e) => setValue(e.target.value)} />
                    ) : (
                      <Input
                        id={id}
                        type={field.type === "number" ? "number" : "text"}
                        step={field.type === "number" ? "0.01" : undefined}
                        required={field.required}
                        value={value == null ? "" : String(value)}
                        onChange={(e) => setValue(e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : null} Save</Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
