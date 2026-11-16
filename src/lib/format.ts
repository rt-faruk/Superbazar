const CURRENCY = "QAR";

/** Money is always stored as a number and formatted through here. */
export function formatMoney(amount: number, symbol = "QAR"): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `${symbol} ${value.toFixed(2)}`;
}

export function formatQar(amount: number): string {
  return formatMoney(amount, "QAR");
}

export function discountPercent(price: number, compareAt: number | null | undefined): number {
  if (!compareAt || compareAt <= 0 || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function orderNumberPreview(): string {
  return `AB-${new Date().getFullYear()}-`;
}

export const CURRENCY_CODE = CURRENCY;

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function clampQty(value: number, stock: number): number {
  const max = stock > 0 ? stock : 1;
  return Math.min(Math.max(1, Math.round(value || 1)), max);
}
