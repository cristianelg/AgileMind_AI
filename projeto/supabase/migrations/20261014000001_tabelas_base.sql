-- AgileMind AI: tabelas base.
-- Toda tabela de dados tem org_id e Row Level Security (ver a migração seguinte).
-- Em organizacoes, a própria chave primária (id) é o identificador da organização.

create table public.organizacoes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (char_length(btrim(nome)) between 1 and 120),
  registrado_em timestamptz not null default now()
);

create table public.membros (
  org_id      uuid not null references public.organizacoes (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  papel       text not null check (papel in ('dono', 'admin', 'membro')),
  registrado_em timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- A busca "a quais organizações este usuário pertence" roda em toda consulta protegida por RLS.
create index membros_user_id_idx on public.membros (user_id);

-- Modelo de dados do projeto. As colunas espelham o CSV; `codigo` é o id do CSV (ex.: ORB-101).
create table public.itens (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizacoes (id) on delete cascade,
  codigo        text not null check (char_length(btrim(codigo)) > 0),
  time          text not null check (char_length(btrim(time)) > 0),
  tipo          text not null check (tipo in ('história', 'bug')),
  titulo        text not null default '',
  status        text not null check (status in ('Backlog', 'Em andamento', 'Code Review', 'Teste', 'Concluído')),
  criado_em     date not null,
  iniciado_em   date,
  concluido_em  date,
  bloqueado     text not null default 'nao' check (bloqueado in ('sim', 'nao')),
  bloqueado_desde date,
  story_points  numeric check (story_points is null or story_points >= 0),
  adicionado_apos_inicio text not null default 'nao' check (adicionado_apos_inicio in ('sim', 'nao')),
  -- Dados de exemplo precisam ser identificáveis como tal ("Dados demonstrativos").
  origem        text not null default 'importado' check (origem in ('importado', 'demonstrativo', 'manual')),
  registrado_em timestamptz not null default now(),

  unique (org_id, codigo),

  -- Mesmas regras da validação de importação, como segunda linha de defesa.
  constraint itens_concluido_exige_iniciado check (concluido_em is null or iniciado_em is not null),
  constraint itens_criado_antes_de_iniciado check (iniciado_em is null or criado_em <= iniciado_em),
  constraint itens_iniciado_antes_de_concluido check (iniciado_em is null or concluido_em is null or iniciado_em <= concluido_em),
  constraint itens_bloqueio_coerente check (
    (bloqueado = 'sim' and bloqueado_desde is not null)
    or (bloqueado = 'nao' and bloqueado_desde is null)
  ),
  constraint itens_bloqueio_apos_criacao check (bloqueado_desde is null or bloqueado_desde >= criado_em),
  constraint itens_bloqueio_ate_conclusao check (bloqueado_desde is null or concluido_em is null or bloqueado_desde <= concluido_em),
  constraint itens_status_e_datas check (
    case status
      when 'Concluído' then concluido_em is not null and iniciado_em is not null
      when 'Backlog'   then iniciado_em is null and concluido_em is null
      else                  iniciado_em is not null and concluido_em is null
    end
  )
);

-- Toda consulta de itens filtra por org_id (via RLS e pela aplicação); por time também.
create index itens_org_time_idx on public.itens (org_id, time);
