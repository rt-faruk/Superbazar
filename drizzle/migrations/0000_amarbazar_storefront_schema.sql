-- AmarBazar storefront schema: roles, catalogue, cart, orders, marketing, settings.

create type public.app_role as enum ('admin', 'customer');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.has_role(auth.uid(), 'admin'), false)
$$;

create type public.order_status as enum (
  'pending', 'confirmed', 'processing', 'packed',
  'shipped', 'out_for_delivery', 'delivered', 'cancelled'
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories (id) on delete set null,
  image_url text,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  brand_id uuid references public.brands (id) on delete set null,
  sku text,
  unit_label text,
  price numeric(10, 2) not null default 0,
  compare_at_price numeric(10, 2),
  stock_quantity integer not null default 0,
  low_stock_threshold integer not null default 10,
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  sold_count integer not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_flash_sale boolean not null default false,
  flash_sale_price numeric(10, 2),
  flash_sale_ends_at timestamptz,
  is_organic boolean not null default false,
  ingredients text,
  specifications jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer not null default 0
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  sku text,
  price numeric(10, 2) not null,
  stock_quantity integer not null default 0,
  sort_order integer not null default 0
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  qty integer not null default 1,
  unit_price numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint cart_items_qty_positive check (qty > 0)
);

create unique index cart_items_unique_line
  on public.cart_items (cart_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  country text not null default 'Qatar',
  city text not null,
  area text,
  street text,
  building_number text,
  apartment_number text,
  delivery_instructions text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null default 'percent',
  value numeric(10, 2) not null default 0,
  min_subtotal numeric(10, 2) not null default 0,
  max_discount numeric(10, 2),
  usage_limit integer,
  used_count integer not null default 0,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint coupons_kind_allowed check (kind in ('percent', 'fixed', 'free_shipping'))
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  link_url text,
  cta_label text,
  position text not null default 'hero',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  fee numeric(10, 2) not null default 0,
  free_over numeric(10, 2),
  min_days integer not null default 1,
  max_days integer not null default 3,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid,
  status public.order_status not null default 'pending',
  payment_method text not null default 'cod',
  payment_status text not null default 'unpaid',
  customer_name text not null,
  phone text not null,
  email text,
  country text not null default 'Qatar',
  city text not null,
  area text,
  street text,
  building_number text,
  apartment_number text,
  delivery_instructions text,
  shipping_method_id uuid references public.shipping_methods (id) on delete set null,
  shipping_fee numeric(10, 2) not null default 0,
  subtotal numeric(10, 2) not null default 0,
  discount numeric(10, 2) not null default 0,
  tax numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  coupon_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  name text not null,
  image_url text,
  unit_label text,
  unit_price numeric(10, 2) not null,
  qty integer not null,
  line_total numeric(10, 2) not null,
  constraint order_items_qty_positive check (qty > 0)
);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'cod',
  amount numeric(10, 2) not null,
  status text not null default 'pending',
  reference text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid,
  author_name text,
  rating integer not null,
  title text,
  body text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  constraint reviews_rating_range check (rating >= 1 and rating <= 5)
);

create table public.website_settings (
  id integer primary key default 1,
  site_name text not null default 'AmarBazar',
  tagline text,
  logo_url text,
  favicon_url text,
  contact_phone text,
  whatsapp_number text,
  contact_email text,
  address text,
  currency text not null default 'QAR',
  currency_symbol text not null default 'QAR',
  tax_rate numeric(5, 2) not null default 0,
  free_shipping_over numeric(10, 2) not null default 200,
  default_shipping_fee numeric(10, 2) not null default 15,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_iban text,
  announcement text,
  social_links jsonb not null default '{}'::jsonb,
  homepage_sections jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint website_settings_singleton check (id = 1)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_touch_updated_at before update on public.products
  for each row execute function public.touch_updated_at();
create trigger orders_touch_updated_at before update on public.orders
  for each row execute function public.touch_updated_at();
create trigger carts_touch_updated_at before update on public.carts
  for each row execute function public.touch_updated_at();
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'phone')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id, role) do nothing;

  if lower(new.email) = 'of19957@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.validate_coupon(_code text, _subtotal numeric)
returns table (code text, kind text, value numeric, discount numeric, free_shipping boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c record;
  amount numeric(10, 2) := 0;
begin
  select * into c from public.coupons cp
  where upper(trim(cp.code)) = upper(trim(_code))
    and cp.is_active = true
    and cp.starts_at <= now()
    and (cp.expires_at is null or cp.expires_at > now())
    and (cp.usage_limit is null or cp.used_count < cp.usage_limit)
    and cp.min_subtotal <= _subtotal
  limit 1;

  if c.id is null then
    return;
  end if;

  if c.kind = 'percent' then
    amount := round(_subtotal * (c.value / 100.0), 2);
    if c.max_discount is not null and amount > c.max_discount then
      amount := c.max_discount;
    end if;
  elsif c.kind = 'fixed' then
    amount := c.value;
    if amount > _subtotal then
      amount := _subtotal;
    end if;
  end if;

  return query select c.code, c.kind, c.value, amount, (c.kind = 'free_shipping');
end;
$$;

create or replace function public.consume_coupon(_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coupons
  set used_count = used_count + 1
  where upper(trim(code)) = upper(trim(_code));
end;
$$;

create or replace function public.refresh_product_rating(_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products p
  set rating_avg = coalesce(agg.avg_rating, 0),
      rating_count = coalesce(agg.cnt, 0)
  from (
    select round(avg(rating)::numeric, 2) as avg_rating, count(*) as cnt
    from public.reviews
    where product_id = _product_id and is_approved = true
  ) agg
  where p.id = _product_id;
end;
$$;

-- grants
grant select on public.categories to anon, authenticated;
grant select on public.brands to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant select on public.product_variants to anon, authenticated;
grant select on public.banners to anon, authenticated;
grant select on public.shipping_methods to anon, authenticated;
grant select on public.website_settings to anon, authenticated;
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.categories, public.brands, public.products, public.product_images,
  public.product_variants, public.banners, public.shipping_methods, public.website_settings, public.reviews to authenticated;
grant insert on public.newsletter_subscribers to anon, authenticated;
grant select on public.newsletter_subscribers to authenticated;
grant select on public.user_roles to authenticated;
grant all on public.profiles to authenticated, service_role;
grant all on public.user_roles to service_role;
grant all on public.categories, public.brands, public.products, public.product_images, public.product_variants,
  public.banners, public.shipping_methods, public.website_settings, public.reviews, public.newsletter_subscribers to service_role;
grant all on public.carts, public.cart_items, public.wishlist_items, public.addresses, public.orders,
  public.order_items, public.order_events, public.payment_transactions, public.coupons to authenticated, service_role;
grant execute on function public.has_role(uuid, public.app_role) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;
revoke execute on function public.consume_coupon(text) from public, anon, authenticated;
grant execute on function public.refresh_product_rating(uuid) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.banners enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.website_settings enable row level security;
alter table public.reviews enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.coupons enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_write" on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "user_roles_select_own_or_admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "user_roles_admin_write" on public.user_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "categories_public_read" on public.categories for select to anon, authenticated
  using (is_active = true or public.is_admin());
create policy "categories_admin_write" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "brands_public_read" on public.brands for select to anon, authenticated
  using (is_active = true or public.is_admin());
create policy "brands_admin_write" on public.brands for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "products_public_read" on public.products for select to anon, authenticated
  using (is_active = true or public.is_admin());
create policy "products_admin_write" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "product_images_public_read" on public.product_images for select to anon, authenticated
  using (true);
create policy "product_images_admin_write" on public.product_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "product_variants_public_read" on public.product_variants for select to anon, authenticated
  using (true);
create policy "product_variants_admin_write" on public.product_variants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "banners_public_read" on public.banners for select to anon, authenticated
  using (
    (is_active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
    or public.is_admin()
  );
create policy "banners_admin_write" on public.banners for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "shipping_methods_public_read" on public.shipping_methods for select to anon, authenticated
  using (is_active = true or public.is_admin());
create policy "shipping_methods_admin_write" on public.shipping_methods for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "website_settings_public_read" on public.website_settings for select to anon, authenticated
  using (true);
create policy "website_settings_admin_write" on public.website_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "reviews_public_read" on public.reviews for select to anon, authenticated
  using (is_approved = true or user_id = auth.uid() or public.is_admin());
create policy "reviews_insert_own" on public.reviews for insert to authenticated
  with check (user_id = auth.uid() and is_approved = false);
create policy "reviews_admin_write" on public.reviews for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "newsletter_admin_read" on public.newsletter_subscribers for select to authenticated
  using (public.is_admin());
create policy "newsletter_public_subscribe" on public.newsletter_subscribers for insert to anon, authenticated
  with check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

create policy "carts_owner" on public.carts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "carts_admin" on public.carts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "cart_items_owner" on public.cart_items for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()));

create policy "wishlist_owner" on public.wishlist_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "addresses_owner" on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "orders_owner_read" on public.orders for select to authenticated
  using (user_id = auth.uid());
create policy "orders_admin" on public.orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "order_items_owner_read" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid()) or public.is_admin());
create policy "order_items_admin_write" on public.order_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "order_events_owner_read" on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_events.order_id and o.user_id = auth.uid()) or public.is_admin());
create policy "order_events_admin_write" on public.order_events for insert to authenticated
  with check (public.is_admin());

create policy "payment_transactions_owner_read" on public.payment_transactions for select to authenticated
  using (exists (select 1 from public.orders o where o.id = payment_transactions.order_id and o.user_id = auth.uid()) or public.is_admin());
create policy "payment_transactions_admin_write" on public.payment_transactions for insert to authenticated
  with check (public.is_admin());

create policy "coupons_admin_write" on public.coupons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create index products_category_idx on public.products (category_id);
create index products_brand_idx on public.products (brand_id);
create index products_active_idx on public.products (is_active, created_at desc);
create index products_flash_idx on public.products (is_flash_sale);
create index categories_parent_idx on public.categories (parent_id);
create index order_items_order_idx on public.order_items (order_id);
create index orders_user_idx on public.orders (user_id);
create index orders_status_idx on public.orders (status);
create index orders_phone_idx on public.orders (phone);
create index reviews_product_idx on public.reviews (product_id, is_approved);
create index cart_items_cart_idx on public.cart_items (cart_id);
create index banners_position_idx on public.banners (position, sort_order);
create index wishlist_user_idx on public.wishlist_items (user_id);
create index addresses_user_idx on public.addresses (user_id);