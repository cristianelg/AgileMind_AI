-- SOMENTE para rodar as migrações em um PostgreSQL comum, fora do Supabase.
-- No Supabase (local ou na nuvem) estes objetos já existem; NÃO rode este arquivo lá.
-- Imita o mínimo do schema auth: a tabela de usuários, auth.uid() e os papéis anon/authenticated.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);

-- Mesma lógica de leitura do token que o Supabase usa: request.jwt.claims (JSON) ou o claim legado.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
