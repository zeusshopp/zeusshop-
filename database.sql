-- =============================================================
-- ZEUSSHOP — master database script (all-in-one, re-runnable)
-- -------------------------------------------------------------
-- LOGIN MODEL (single login = the Supabase account):
--   * The admin login page signs in DIRECTLY with the Supabase
--     email/password you type there (no second login ceremony).
--   * First successful login auto-creates the matching Supabase
--     account with the typed password (explicit login only) and
--     calls admin_self_register() to add your uid to public.admins.
--   * Background flows (panel auto-ensure, write guards) NEVER
--     signUp — so no confirmation emails / rate-limit spam.
--   * If you'd rather create the account by hand:
--       Auth → Users → Add user (email + password ≥ 6 chars)
--     then run the BOOTSTRAP snippet below (section 0b).
--
-- Sections:
-- 0b) admins table + first-admin bootstrap (email-based)
-- 1) RLS enabled everywhere
-- 2) helper functions (is_admin, count_users, checkout_allowed,
--    admin_self_register)
-- 3) orders: coupon column + primary key + indexes
-- 4) every RLS policy, dropped & re-created INSIDE one DO block
--    (direct DDL → "policy already exists" (42710) never happens)
-- 5) default payment card
-- 6) Realtime publication
-- 7) manual approved order: M4A1-S | Night Terror — @DaliliAmir
--    (190,000 toman, 2 days ago, img image/M4.webp)
-- Run: SQL Editor → New query (empty buffer) → paste → Run.
-- =============================================================

-- 0b) ADMINS TABLE + FIRST-ADMIN BOOTSTRAP ----------------------
-- The admins table only stores uids; is_admin() checks membership.
-- Make sure it exists (re-runnable):
create table if not exists public.admins (id uuid primary key);

-- FIRST ADMIN the manual way (skip using the login page):
--   1) Auth → Users → Add user  (tick "Auto Confirm User" if
--      "Confirm email" is ON, otherwise no confirmation email)
--   2) Replace the address below and run:
--
--   insert into public.admins (id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict (id) do nothing;

-- 1) ROW LEVEL SECURITY ----------------------------------------
do $$
begin
  execute 'alter table public.skins enable row level security';
  execute 'alter table public.orders enable row level security';
  execute 'alter table public.inventory enable row level security';
  execute 'alter table public.users enable row level security';
  execute 'alter table public.announcement enable row level security';
  execute 'alter table public.admins enable row level security';
  execute 'alter table public.site_settings enable row level security';
  execute 'alter table public.coupon_claims enable row level security';
end $$;

-- 2) HELPER FUNCTIONS -------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.admins where id = auth.uid())
$$;

create or replace function public.count_users()
returns bigint language sql stable security definer as $$
  select count(*)::bigint from public.users
$$;
revoke execute on function public.count_users() from public, anon, authenticated;
grant execute on function public.count_users() to anon, authenticated;

create or replace function public.checkout_allowed(tg text)
returns boolean language sql stable security definer as $$
  select
    (select count(*) from public.orders where telegram = tg and status = 'pending') < 3
    and (select coalesce(max(date), '-infinity') from public.orders where telegram = tg)
        < now() - interval '30 seconds'
$$;
revoke execute on function public.checkout_allowed(text) from public, anon, authenticated;
grant execute on function public.checkout_allowed(text) to anon, authenticated;

-- 2b) SELF-REGISTER: after the admin logs in (either with their
--     typed Supabase credentials or a freshly auto-created account),
--     this adds the signed-in uid to public.admins, so RLS's
--     is_admin() passes — no separate registering step needed.
create or replace function public.admin_self_register()
returns boolean language plpgsql security definer as $$
begin
  if auth.uid() is null then return false; end if;
  insert into public.admins (id) values (auth.uid())
  on conflict (id) do nothing;
  return true;
end $$;
revoke execute on function public.admin_self_register() from public;
grant execute on function public.admin_self_register() to anon, authenticated;

-- 3) ORDERS: coupon column + real PK + indexes -------------------
alter table public.orders add column if not exists coupon text not null default '';
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.orders'::regclass and contype = 'p') then
    execute 'alter table public.orders add primary key (id)';
  end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'orders' and indexname = 'idx_orders_telegram') then
    execute 'create index idx_orders_telegram on public.orders (telegram)';
  end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'orders' and indexname = 'idx_orders_status') then
    execute 'create index idx_orders_status on public.orders (status)';
  end if;
end $$;

-- 4) POLICIES (drop-then-create, one block each) ------------------

-- skins
do $$ begin
  execute 'drop policy if exists "skins public read" on public.skins';
  execute 'create policy "skins public read" on public.skins for select using (true)';
end $$;
do $$ begin
  execute 'drop policy if exists "skins admin write" on public.skins';
  execute 'create policy "skins admin write" on public.skins for all using (public.is_admin()) with check (public.is_admin())';
end $$;

-- orders
do $$ begin
  execute 'drop policy if exists "orders public read approved" on public.orders';
  execute 'create policy "orders public read approved" on public.orders for select using (status = ''approved'')';
end $$;
do $$ begin
  execute 'drop policy if exists "orders admin read" on public.orders';
  execute 'create policy "orders admin read" on public.orders for select using (public.is_admin())';
end $$;
do $$ begin
  execute 'drop policy if exists "orders admin change" on public.orders';
  execute 'create policy "orders admin change" on public.orders for update using (public.is_admin()) with check (public.is_admin())';
end $$;
do $$ begin
  execute 'drop policy if exists "orders admin delete" on public.orders';
  execute 'create policy "orders admin delete" on public.orders for delete using (public.is_admin())';
end $$;
do $$ begin
  execute 'drop policy if exists "orders public insert" on public.orders';
  execute 'drop policy if exists "orders public insert guarded" on public.orders';
  execute 'create policy "orders public insert guarded" on public.orders for insert with check (public.checkout_allowed(telegram))';
end $$;

-- inventory
do $$ begin
  execute 'drop policy if exists "inventory public read" on public.inventory';
  execute 'create policy "inventory public read" on public.inventory for select using (true)';
end $$;
do $$ begin
  execute 'drop policy if exists "inventory admin write" on public.inventory';
  execute 'create policy "inventory admin write" on public.inventory for all using (public.is_admin()) with check (public.is_admin())';
end $$;

-- users
do $$ begin
  execute 'drop policy if exists "users public insert" on public.users';
  execute 'create policy "users public insert" on public.users for insert with check (true)';
end $$;
do $$ begin
  execute 'drop policy if exists "users admin read" on public.users';
  execute 'create policy "users admin read" on public.users for select using (public.is_admin())';
end $$;
do $$ begin
  execute 'drop policy if exists "users admin change" on public.users';
  execute 'create policy "users admin change" on public.users for update using (public.is_admin()) with check (public.is_admin())';
end $$;
do $$ begin
  execute 'drop policy if exists "users admin delete" on public.users';
  execute 'create policy "users admin delete" on public.users for delete using (public.is_admin())';
end $$;

-- announcement
do $$ begin
  execute 'drop policy if exists "announcement public read" on public.announcement';
  execute 'create policy "announcement public read" on public.announcement for select using (true)';
end $$;
do $$ begin
  execute 'drop policy if exists "announcement admin write" on public.announcement';
  execute 'create policy "announcement admin write" on public.announcement for all using (public.is_admin()) with check (public.is_admin())';
end $$;

-- admins
do $$ begin
  execute 'drop policy if exists "admins read own" on public.admins';
  execute 'create policy "admins read own" on public.admins for select using (auth.uid() = id)';
end $$;

-- site_settings
do $$ begin
  execute 'drop policy if exists "settings public read" on public.site_settings';
  execute 'create policy "settings public read" on public.site_settings for select using (true)';
end $$;
do $$ begin
  execute 'drop policy if exists "settings admin write" on public.site_settings';
  execute 'create policy "settings admin write" on public.site_settings for all using (public.is_admin()) with check (public.is_admin())';
end $$;

-- coupon_claims
do $$ begin
  execute 'drop policy if exists "claims public insert" on public.coupon_claims';
  execute 'create policy "claims public insert" on public.coupon_claims for insert with check (true)';
end $$;
do $$ begin
  execute 'drop policy if exists "claims public read" on public.coupon_claims';
  execute 'create policy "claims public read" on public.coupon_claims for select using (true)';
end $$;
do $$ begin
  execute 'drop policy if exists "claims public delete" on public.coupon_claims';
  execute 'create policy "claims public delete" on public.coupon_claims for delete using (public.is_admin())';
end $$;

-- 5) DEFAULT PAYMENT CARD (editable from the admin panel) --------
insert into public.site_settings (key, value) values
  ('pay_card', '6037-9919-7890-0000'),
  ('pay_card_name', 'علی رضایی')
on conflict (key) do nothing;

-- 6) REALTIME (live updates) -------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'skins') then
    alter publication supabase_realtime add table public.skins;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'announcement') then
    alter publication supabase_realtime add table public.announcement;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'site_settings') then
    alter publication supabase_realtime add table public.site_settings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'users') then
    alter publication supabase_realtime add table public.users;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inventory') then
    alter publication supabase_realtime add table public.inventory;
  end if;
end $$;

-- 7) MANUAL APPROVED ORDER — M4A1-S | Night Terror for @DaliliAmir
--    (190,000 toman, 2 days ago, thumbnail image/M4.webp)
--    Deletes any previous test rows for this buyer first, so the
--    ticker shows EXACTLY ONE correct item. Re-runnable.
do $$
declare
  oid bigint;
  tag text := '@DaliliAmir';
  item_price numeric := 190000;
  item_name text := 'M4A1-S | Night Terror';
  item_weapon text := 'M4A1-S';
  item_rarity text := 'Covert';
  item_img text := 'image/M4.webp';
begin
  -- clear old/wrong test orders for this buyer (e.g. "M4A4 | Night Terror")
  delete from public.orders where telegram = tag;
  delete from public.inventory where telegram = tag;

  oid := (select coalesce(max(id), 0) + 1 from public.orders);

  insert into public.orders (id, telegram, items, total, status, coupon, date)
  values (
    oid,
    tag,
    jsonb_build_array(jsonb_build_object(
      'name', item_name,
      'price', item_price,
      'img', item_img,
      'rarity', item_rarity,
      'weapon', item_weapon
    )),
    item_price,
    'approved',
    '',
    now() - interval '2 days'
  );

  -- buyer's own inventory (as admin approval normally does)
  insert into public.inventory (telegram, name, price, img, weapon, wear, rarity, type, created_at)
  values (
    tag, item_name, item_price, item_img, item_weapon, 'Covert', item_rarity, '',
    now() - interval '2 days'
  );

  insert into public.users (tg, date)
  values (tag, now() - interval '2 days')
  on conflict (tg) do nothing;

  raise notice 'DONE: order #% added for % — % (190,000)', oid, tag, item_name;
end $$;