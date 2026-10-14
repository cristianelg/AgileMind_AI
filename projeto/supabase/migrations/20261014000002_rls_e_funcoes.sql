-- Row Level Security, funções de apoio e permissões.
-- Princípio: negar por padrão. Só existe política para o que a aplicação precisa fazer.

alter table public.organizacoes enable row level security;
alter table public.membros      enable row level security;
alter table public.itens        enable row level security;

-- Funções de apoio das políticas.
-- SECURITY DEFINER para ler `membros` sem passar pela própria RLS (evita recursão infinita).
-- search_path vazio e nomes qualificados: evita sequestro de função por schema.
-- `(select auth.uid())` é avaliado uma vez por consulta, não por linha.
create or replace function public.orgs_do_usuario()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.org_id from public.membros m where m.user_id = (select auth.uid());
$$;

create or replace function public.papel_na_org(p_org uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.papel from public.membros m
  where m.org_id = p_org and m.user_id = (select auth.uid());
$$;

-- Criar organização: quem cria vira dono. Única porta de entrada para uma organização nova,
-- porque as políticas não permitem INSERT direto em organizacoes nem em membros.
create or replace function public.criar_organizacao(p_nome text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_org uuid;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado' using errcode = '28000';
  end if;
  insert into public.organizacoes (nome) values (p_nome) returning id into v_org;
  insert into public.membros (org_id, user_id, papel) values (v_org, v_user, 'dono');
  return v_org;
end;
$$;

-- Permissões de execução: só usuário autenticado.
revoke all on function public.orgs_do_usuario()          from public, anon;
revoke all on function public.papel_na_org(uuid)         from public, anon;
revoke all on function public.criar_organizacao(text)    from public, anon;
grant execute on function public.orgs_do_usuario()       to authenticated;
grant execute on function public.papel_na_org(uuid)      to authenticated;
grant execute on function public.criar_organizacao(text) to authenticated;

-- Permissões de tabela: anon não acessa nada; authenticated só o que as políticas descrevem.
revoke all on public.organizacoes from anon, authenticated;
revoke all on public.membros      from anon, authenticated;
revoke all on public.itens        from anon, authenticated;
grant select                         on public.organizacoes to authenticated;
grant select                         on public.membros      to authenticated;
grant select, insert, update, delete on public.itens        to authenticated;

-- organizacoes: o usuário vê as suas. Criação só pela função criar_organizacao.
create policy organizacoes_leitura on public.organizacoes
  for select to authenticated
  using (id in (select public.orgs_do_usuario()));

-- membros: o usuário vê os membros das suas organizações.
-- Sem políticas de escrita: convite e troca de papel ficam para uma próxima versão.
create policy membros_leitura on public.membros
  for select to authenticated
  using (org_id in (select public.orgs_do_usuario()));

-- itens: qualquer membro lê; dono e admin escrevem.
-- O WITH CHECK impede inserir ou mover um item para uma organização que não é do usuário.
create policy itens_leitura on public.itens
  for select to authenticated
  using (org_id in (select public.orgs_do_usuario()));

create policy itens_insercao on public.itens
  for insert to authenticated
  with check (public.papel_na_org(org_id) in ('dono', 'admin'));

create policy itens_atualizacao on public.itens
  for update to authenticated
  using (public.papel_na_org(org_id) in ('dono', 'admin'))
  with check (public.papel_na_org(org_id) in ('dono', 'admin'));

create policy itens_exclusao on public.itens
  for delete to authenticated
  using (public.papel_na_org(org_id) in ('dono', 'admin'));
