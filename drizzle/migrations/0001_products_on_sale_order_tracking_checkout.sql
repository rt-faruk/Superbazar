alter table public.products
  add column is_on_sale boolean generated always as (
    case
      when flash_sale_price is not null and flash_sale_price < price then true
      when compare_at_price is not null and compare_at_price > price then true
      else false
    end
  ) stored;

create index products_on_sale_idx on public.products (is_on_sale);

create or replace function public.track_order(_order_number text, _phone text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
  clean_phone text := replace(replace(coalesce(_phone, ''), ' ', ''), '-', '');
begin
  if clean_phone = '' or coalesce(trim(_order_number), '') = '' then
    return null;
  end if;

  select jsonb_build_object(
      'order_number', o.order_number,
      'status', o.status,
      'payment_method', o.payment_method,
      'payment_status', o.payment_status,
      'customer_name', o.customer_name,
      'phone', o.phone,
      'city', o.city,
      'area', o.area,
      'subtotal', o.subtotal,
      'discount', o.discount,
      'shipping_fee', o.shipping_fee,
      'total', o.total,
      'created_at', o.created_at,
      'items', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'name', oi.name, 'qty', oi.qty, 'unit_price', oi.unit_price,
          'line_total', oi.line_total, 'image_url', oi.image_url, 'unit_label', oi.unit_label
        ) order by oi.name), '[]'::jsonb)
        from public.order_items oi where oi.order_id = o.id
      ),
      'events', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'status', oe.status, 'note', oe.note, 'created_at', oe.created_at
        ) order by oe.created_at), '[]'::jsonb)
        from public.order_events oe where oe.order_id = o.id
      )
    )
  into result
  from public.orders o
  where upper(trim(o.order_number)) = upper(trim(_order_number))
    and replace(replace(o.phone, ' ', ''), '-', '') = clean_phone
  limit 1;

  return result;
end;
$$;

grant execute on function public.track_order(text, text) to anon, authenticated;

create policy "product_images_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "product_images_authenticated_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images');
create policy "product_images_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "product_images_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

create or replace function public.place_cod_order(_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items jsonb := coalesce(_payload -> 'items', '[]'::jsonb);
  v_customer jsonb := coalesce(_payload -> 'customer', '{}'::jsonb);
  v_name text := trim(coalesce(v_customer ->> 'name', ''));
  v_phone text := trim(coalesce(v_customer ->> 'phone', ''));
  v_email text := nullif(trim(coalesce(v_customer ->> 'email', '')), '');
  v_city text := trim(coalesce(v_customer ->> 'city', ''));
  v_area text := nullif(trim(coalesce(v_customer ->> 'area', '')), '');
  v_street text := nullif(trim(coalesce(v_customer ->> 'street', '')), '');
  v_building text := nullif(trim(coalesce(v_customer ->> 'building_number', '')), '');
  v_apartment text := nullif(trim(coalesce(v_customer ->> 'apartment_number', '')), '');
  v_notes text := nullif(trim(coalesce(v_customer ->> 'delivery_instructions', '')), '');
  v_shipping uuid := nullif(coalesce(_payload ->> 'shipping_method_id', ''), '')::uuid;
  v_coupon text := nullif(trim(coalesce(_payload ->> 'coupon_code', '')), '');
  v_user uuid := auth.uid();
  v_settings record;
  v_method record;
  v_line jsonb;
  v_product record;
  v_variant record;
  v_qty integer;
  v_price numeric(10, 2);
  v_unit text;
  v_image text;
  v_name_line text;
  v_line_total numeric(10, 2);
  v_lines jsonb := '[]'::jsonb;
  v_subtotal numeric(10, 2) := 0;
  v_discount numeric(10, 2) := 0;
  v_tax numeric(10, 2) := 0;
  v_shipping_fee numeric(10, 2) := 0;
  v_total numeric(10, 2) := 0;
  v_free_shipping boolean := false;
  v_coupon_row record;
  v_order uuid;
  v_number text;
begin
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;
  if v_name = '' or v_phone = '' or v_city = '' then
    raise exception 'MISSING_CUSTOMER_FIELDS';
  end if;

  select * into v_settings from public.website_settings where id = 1;
  if not found then
    raise exception 'STORE_NOT_CONFIGURED';
  end if;

  select * into v_method from public.shipping_methods where id = v_shipping and is_active = true;
  if not found then
    select * into v_method from public.shipping_methods where is_active = true order by sort_order limit 1;
  end if;
  if not found then
    raise exception 'NO_SHIPPING_METHOD';
  end if;

  for v_line in select * from jsonb_array_elements(v_items) loop
    v_qty := nullif(v_line ->> 'qty', '')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 50 then
      raise exception 'BAD_QUANTITY';
    end if;

    select * into v_product from public.products
      where id = nullif(v_line ->> 'product_id', '')::uuid and is_active = true;
    if not found then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;

    v_price := case
      when v_product.is_flash_sale and v_product.flash_sale_price is not null
        and (v_product.flash_sale_ends_at is null or v_product.flash_sale_ends_at > now())
      then v_product.flash_sale_price
      else v_product.price
    end;
    v_unit := v_product.unit_label;
    v_image := v_product.image_url;
    v_name_line := v_product.name;

    if nullif(v_line ->> 'variant_id', '') is not null then
      select * into v_variant from public.product_variants
        where id = (v_line ->> 'variant_id')::uuid and product_id = v_product.id;
      if not found then
        raise exception 'VARIANT_UNAVAILABLE';
      end if;
      v_price := v_variant.price;
      v_unit := v_variant.name;
      update public.product_variants set stock_quantity = stock_quantity - v_qty
        where id = v_variant.id and stock_quantity >= v_qty;
      if not found then
        raise exception 'OUT_OF_STOCK';
      end if;
    else
      update public.products set stock_quantity = stock_quantity - v_qty
        where id = v_product.id and stock_quantity >= v_qty;
      if not found then
        raise exception 'OUT_OF_STOCK';
      end if;
    end if;

    update public.products set sold_count = sold_count + v_qty where id = v_product.id;

    v_line_total := round(v_price * v_qty, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'variant_id', nullif(v_line ->> 'variant_id', '')::uuid,
      'name', v_name_line,
      'image_url', v_image,
      'unit_label', v_unit,
      'unit_price', v_price,
      'qty', v_qty,
      'line_total', v_line_total
    ));
  end loop;

  if v_coupon is not null then
    select * into v_coupon_row from public.validate_coupon(v_coupon, v_subtotal);
    if not found then
      raise exception 'BAD_COUPON';
    end if;
    if v_coupon_row.kind = 'free_shipping' then
      v_free_shipping := true;
    else
      v_discount := v_coupon_row.discount;
    end if;
    v_discount := least(round(v_discount, 2), v_subtotal);
  end if;

  v_shipping_fee := coalesce(v_method.fee, 0);
  if v_free_shipping
    or (v_method.free_over is not null and v_subtotal - v_discount >= v_method.free_over)
    or (v_settings.free_shipping_over is not null
        and v_subtotal - v_discount >= v_settings.free_shipping_over
        and v_method.free_over is null) then
    v_shipping_fee := 0;
  end if;

  v_tax := round(greatest(v_subtotal - v_discount, 0) * coalesce(v_settings.tax_rate, 0) / 100, 2);
  v_total := round(greatest(v_subtotal - v_discount, 0) + v_shipping_fee + v_tax, 2);

  loop
    v_number := 'AB' || to_char(now(), 'yymmdd') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    exit when not exists (select 1 from public.orders where order_number = v_number);
  end loop;

  insert into public.orders
    (order_number, user_id, status, payment_method, payment_status,
     customer_name, phone, email, country, city, area, street,
     building_number, apartment_number, delivery_instructions,
     shipping_method_id, shipping_fee, subtotal, discount, tax, total, coupon_code)
  values
    (v_number, v_user, 'pending', 'cod', 'unpaid',
     v_name, v_phone, v_email, 'Qatar', v_city, v_area, v_street,
     v_building, v_apartment, v_notes,
     v_method.id, v_shipping_fee, v_subtotal, v_discount, v_tax, v_total, v_coupon)
  returning id into v_order;

  insert into public.order_items
    (order_id, product_id, variant_id, name, image_url, unit_label, unit_price, qty, line_total)
  select v_order,
         (l ->> 'product_id')::uuid,
         nullif(l ->> 'variant_id', '')::uuid,
         l ->> 'name',
         nullif(l ->> 'image_url', ''),
         nullif(l ->> 'unit_label', ''),
         (l ->> 'unit_price')::numeric,
         (l ->> 'qty')::integer,
         (l ->> 'line_total')::numeric
  from jsonb_array_elements(v_lines) as l;

  insert into public.order_events (order_id, status, note) values (v_order, 'pending', 'Order received');

  insert into public.payment_transactions (order_id, provider, amount, status)
  values (v_order, 'cod', v_total, 'pending');

  if v_coupon is not null then
    perform public.consume_coupon(v_coupon);
  end if;

  return jsonb_build_object(
    'order_number', v_number,
    'status', 'pending',
    'payment_method', 'cod',
    'payment_status', 'unpaid',
    'customer_name', v_name,
    'phone', v_phone,
    'city', v_city,
    'area', v_area,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'shipping_fee', v_shipping_fee,
    'tax', v_tax,
    'total', v_total,
    'coupon_code', v_coupon,
    'shipping_method', v_method.name,
    'delivery_days', jsonb_build_object('min', v_method.min_days, 'max', v_method.max_days),
    'created_at', now(),
    'items', v_lines
  );
end
$$;

revoke execute on function public.place_cod_order(jsonb) from public;
grant execute on function public.place_cod_order(jsonb) to anon, authenticated, service_role;