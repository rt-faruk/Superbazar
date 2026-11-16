<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (AmarBazar)

- Signed-in pages (account, wishlist, admin) live under `src/routes/_authenticated/`; its client-only gate redirects to `/auth`, so no page-level auth checks are needed.
- Admin pages sit under `_authenticated/admin.tsx`, which checks `is_admin()`; every admin server function still re-checks the role because routes don't protect server functions.
- Checkout, coupon checks and order tracking go through database functions (`place_cod_order`, `validate_coupon`, `track_order`) so prices, stock and totals are always recomputed server-side.
- Product photos are uploaded to the private `product-images` bucket and served through `/api/public/product-image/<path>`, because public buckets are not allowed on this backend.
- Route files export only `Route`; shared constants and helpers go in `src/lib/` so route code-splitting keeps working.
