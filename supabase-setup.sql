-- À exécuter une fois dans Supabase > SQL Editor.
alter table articles add column if not exists image_position text default 'center center';
alter table articles add column if not exists author_id uuid;
alter table articles add column if not exists author_name text;
alter table articles enable row level security;
alter table contacts enable row level security;
drop policy if exists "articles_read" on articles;
drop policy if exists "articles_insert" on articles;
drop policy if exists "articles_update" on articles;
drop policy if exists "articles_delete" on articles;
create policy "articles_read"   on articles for select using (true);
create policy "articles_insert" on articles for insert to authenticated with check (auth.uid() = author_id);
create policy "articles_update" on articles for update to authenticated using (auth.uid() = author_id);
create policy "articles_delete" on articles for delete to authenticated using (auth.uid() = author_id);
drop policy if exists "contacts_insert" on contacts;
create policy "contacts_insert" on contacts for insert with check (true);
-- Images : le bucket "article-images" doit être public en lecture, et autoriser l'upload aux utilisateurs connectés.
