-- Teste de isolamento entre organizações (RLS).
--
-- Roda dentro de uma transação e termina com ROLLBACK: não deixa dados.
-- Cada verificação imprime PASS ou aborta com FALHOU. Se qualquer uma falhar, o psql sai com erro
-- (rode com -v ON_ERROR_STOP=1).
--
-- Personagens: A e B são donos de organizações diferentes; M é membro (só leitura) da organização A;
-- C não pertence a nenhuma organização.

\set ON_ERROR_STOP on
begin;

-- Fixtures, criadas com o papel dono do banco (que ignora RLS).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@exemplo.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@exemplo.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'c@exemplo.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'm@exemplo.test');

insert into public.organizacoes (id, nome) values
  ('00000000-0000-0000-0000-00000000aaaa', 'Organização A'),
  ('00000000-0000-0000-0000-00000000bbbb', 'Organização B');

insert into public.membros (org_id, user_id, papel) values
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000a1', 'dono'),
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d1', 'membro'),
  ('00000000-0000-0000-0000-00000000bbbb', '00000000-0000-0000-0000-0000000000b1', 'dono');

insert into public.itens (org_id, codigo, time, tipo, titulo, status, criado_em, iniciado_em, concluido_em, bloqueado, bloqueado_desde, story_points, adicionado_apos_inicio, origem) values
  ('00000000-0000-0000-0000-00000000aaaa', 'A-1', 'Time A', 'história', 'Item A1', 'Em andamento', '2026-10-01', '2026-10-02', null, 'nao', null, 3, 'nao', 'demonstrativo'),
  ('00000000-0000-0000-0000-00000000aaaa', 'A-2', 'Time A', 'bug',      'Item A2', 'Concluído',    '2026-09-20', '2026-09-21', '2026-09-25', 'nao', null, 1, 'nao', 'demonstrativo'),
  ('00000000-0000-0000-0000-00000000aaaa', 'A-3', 'Time A', 'história', 'Item A3', 'Backlog',      '2026-10-05', null, null, 'nao', null, 2, 'sim', 'demonstrativo'),
  ('00000000-0000-0000-0000-00000000bbbb', 'B-1', 'Time B', 'história', 'Item B1', 'Em andamento', '2026-10-01', '2026-10-02', null, 'sim', '2026-10-03', 5, 'nao', 'demonstrativo'),
  ('00000000-0000-0000-0000-00000000bbbb', 'B-2', 'Time B', 'bug',      'Item B2', 'Teste',        '2026-10-01', '2026-10-04', null, 'nao', null, 1, 'nao', 'demonstrativo');

-- 0. RLS ligada nas três tabelas.
do $$
declare faltando text;
begin
  select string_agg(relname, ', ') into faltando
  from pg_class
  where relnamespace = 'public'::regnamespace
    and relname in ('organizacoes', 'membros', 'itens')
    and not relrowsecurity;
  if faltando is not null then raise exception using errcode = 'P0001', message = 'FALHOU: RLS desligada em: ' || faltando; end if;
  raise notice 'PASS 00: RLS habilitada em organizacoes, membros e itens';
end $$;

------------------------------------------------------------------------------------------------
-- Usuário A (dono da organização A)
------------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

do $$
declare n int;
begin
  select count(*) into n from public.itens;
  if n <> 3 then raise exception using errcode = 'P0001', message = format('FALHOU 01: A deveria ver 3 itens, viu %s', n); end if;
  raise notice 'PASS 01: A vê somente os 3 itens da organização A';

  select count(*) into n from public.itens where org_id = '00000000-0000-0000-0000-00000000bbbb';
  if n <> 0 then raise exception using errcode = 'P0001', message = format('FALHOU 02: A leu %s itens da organização B', n); end if;
  raise notice 'PASS 02: A não lê itens da organização B, nem filtrando pelo org_id dela';

  select count(*) into n from public.itens where codigo in ('B-1', 'B-2');
  if n <> 0 then raise exception using errcode = 'P0001', message = 'FALHOU 03: A leu itens de B pelo código'; end if;
  raise notice 'PASS 03: A não lê itens de B pelo código';

  select count(*) into n from public.organizacoes;
  if n <> 1 then raise exception using errcode = 'P0001', message = format('FALHOU 04: A deveria ver 1 organização, viu %s', n); end if;
  raise notice 'PASS 04: A vê somente a própria organização';

  select count(*) into n from public.membros where org_id = '00000000-0000-0000-0000-00000000bbbb';
  if n <> 0 then raise exception using errcode = 'P0001', message = 'FALHOU 05: A leu membros da organização B'; end if;
  select count(*) into n from public.membros;
  if n <> 2 then raise exception using errcode = 'P0001', message = format('FALHOU 05: A deveria ver 2 membros (A e M), viu %s', n); end if;
  raise notice 'PASS 05: A vê os membros da organização A e nenhum da B';

  select count(*) into n from public.orgs_do_usuario();
  if n <> 1 then raise exception using errcode = 'P0001', message = 'FALHOU 06: orgs_do_usuario() devolveu o que não devia'; end if;
  raise notice 'PASS 06: orgs_do_usuario() devolve só a organização A';
end $$;

-- Escritas de A na organização B devem ser negadas.
do $$
begin
  begin
    insert into public.itens (org_id, codigo, time, tipo, titulo, status, criado_em)
    values ('00000000-0000-0000-0000-00000000bbbb', 'INVASOR-1', 'Time B', 'bug', 'não deveria entrar', 'Backlog', '2026-10-10');
    raise exception using errcode = 'P0001', message = 'FALHOU 07: A inseriu item na organização B';
  exception when insufficient_privilege then
    raise notice 'PASS 07: A não insere item na organização B (RLS bloqueou)';
  end;
end $$;

do $$
declare n int;
begin
  update public.itens set titulo = 'alterado por A' where org_id = '00000000-0000-0000-0000-00000000bbbb';
  get diagnostics n = row_count;
  if n <> 0 then raise exception using errcode = 'P0001', message = format('FALHOU 08: A alterou %s itens da organização B', n); end if;
  raise notice 'PASS 08: A não altera itens da organização B (0 linhas afetadas)';

  delete from public.itens where org_id = '00000000-0000-0000-0000-00000000bbbb';
  get diagnostics n = row_count;
  if n <> 0 then raise exception using errcode = 'P0001', message = format('FALHOU 09: A apagou %s itens da organização B', n); end if;
  raise notice 'PASS 09: A não apaga itens da organização B (0 linhas afetadas)';

  begin
    update public.organizacoes set nome = 'sequestrada' where id = '00000000-0000-0000-0000-00000000bbbb';
    get diagnostics n = row_count;
    if n <> 0 then raise exception using errcode = 'P0001', message = 'FALHOU 10: A alterou a organização B'; end if;
    raise notice 'PASS 10: A não altera a organização B (0 linhas afetadas)';
  exception when insufficient_privilege then
    raise notice 'PASS 10: A não altera a organização B (sem privilégio de UPDATE)';
  end;
end $$;

-- A não pode mover um item dela para a organização B (WITH CHECK).
do $$
begin
  begin
    update public.itens set org_id = '00000000-0000-0000-0000-00000000bbbb' where codigo = 'A-1';
    raise exception using errcode = 'P0001', message = 'FALHOU 11: A moveu um item para a organização B';
  exception when insufficient_privilege then
    raise notice 'PASS 11: A não move item para a organização B';
  end;
end $$;

-- A não pode se adicionar como membro da organização B, nem criar organização direto na tabela.
do $$
begin
  begin
    insert into public.membros (org_id, user_id, papel)
    values ('00000000-0000-0000-0000-00000000bbbb', '00000000-0000-0000-0000-0000000000a1', 'dono');
    raise exception using errcode = 'P0001', message = 'FALHOU 12: A se adicionou como dono da organização B';
  exception when insufficient_privilege then
    raise notice 'PASS 12: A não se adiciona como membro da organização B';
  end;
  begin
    insert into public.organizacoes (nome) values ('criada na marra');
    raise exception using errcode = 'P0001', message = 'FALHOU 13: A inseriu organização direto na tabela';
  exception when insufficient_privilege then
    raise notice 'PASS 13: organização só nasce pela função criar_organizacao';
  end;
end $$;

-- Escrita legítima de A na própria organização funciona (garante que o teste não passa só porque tudo está bloqueado).
do $$
declare n int;
begin
  insert into public.itens (org_id, codigo, time, tipo, titulo, status, criado_em)
  values ('00000000-0000-0000-0000-00000000aaaa', 'A-4', 'Time A', 'bug', 'novo item de A', 'Backlog', '2026-10-10');
  select count(*) into n from public.itens;
  if n <> 4 then raise exception using errcode = 'P0001', message = 'FALHOU 14: A não conseguiu inserir na própria organização'; end if;
  raise notice 'PASS 14: A insere na própria organização (controle positivo)';
end $$;

-- Criar organização pela função: quem cria vira dono e vê a nova organização.
do $$
declare v uuid; n int; p text;
begin
  v := public.criar_organizacao('Organização criada por A');
  select count(*) into n from public.organizacoes;
  if n <> 2 then raise exception using errcode = 'P0001', message = 'FALHOU 15: A não vê a organização que criou'; end if;
  p := public.papel_na_org(v);
  if p is distinct from 'dono' then raise exception using errcode = 'P0001', message = 'FALHOU 15: criador não virou dono'; end if;
  raise notice 'PASS 15: criar_organizacao faz o criador virar dono';
end $$;

-- As restrições do banco (CHECK) barram dados incoerentes mesmo de quem pode escrever.
do $$
begin
  begin
    insert into public.itens (org_id, codigo, time, tipo, titulo, status, criado_em, iniciado_em)
    values ('00000000-0000-0000-0000-00000000aaaa', 'A-5', 'Time A', 'bug', 'Concluído sem data', 'Concluído', '2026-10-01', '2026-10-02');
    raise exception using errcode = 'P0001', message = 'FALHOU 16: aceitou status Concluído sem concluido_em';
  exception when check_violation then
    raise notice 'PASS 16: CHECK barra status Concluído sem concluido_em';
  end;
end $$;

reset role;

------------------------------------------------------------------------------------------------
-- Usuário B: o espelho. Vê só a organização B, e nada do que A fez.
------------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;

do $$
declare n int;
begin
  select count(*) into n from public.itens;
  if n <> 2 then raise exception using errcode = 'P0001', message = format('FALHOU 17: B deveria ver 2 itens, viu %s', n); end if;
  select count(*) into n from public.itens where codigo like 'A-%';
  if n <> 0 then raise exception using errcode = 'P0001', message = 'FALHOU 17: B leu itens de A'; end if;
  select count(*) into n from public.itens where titulo = 'alterado por A';
  if n <> 0 then raise exception using errcode = 'P0001', message = 'FALHOU 17: itens de B foram alterados por A'; end if;
  raise notice 'PASS 17: B vê só os próprios 2 itens, intactos';
end $$;

reset role;

------------------------------------------------------------------------------------------------
-- Usuário M (membro da organização A): lê, mas não escreve.
------------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;

do $$
declare n int;
begin
  select count(*) into n from public.itens where org_id = '00000000-0000-0000-0000-00000000aaaa';
  if n < 3 then raise exception using errcode = 'P0001', message = 'FALHOU 18: membro não lê itens da própria organização'; end if;
  raise notice 'PASS 18: membro lê os itens da organização A';
  begin
    insert into public.itens (org_id, codigo, time, tipo, titulo, status, criado_em)
    values ('00000000-0000-0000-0000-00000000aaaa', 'M-1', 'Time A', 'bug', 'membro não escreve', 'Backlog', '2026-10-10');
    raise exception using errcode = 'P0001', message = 'FALHOU 19: membro inseriu item';
  exception when insufficient_privilege then
    raise notice 'PASS 19: membro não insere item (só dono e admin escrevem)';
  end;
  update public.itens set titulo = 'membro alterou' where org_id = '00000000-0000-0000-0000-00000000aaaa';
  get diagnostics n = row_count;
  if n <> 0 then raise exception using errcode = 'P0001', message = 'FALHOU 20: membro alterou itens'; end if;
  raise notice 'PASS 20: membro não altera itens';
end $$;

reset role;

------------------------------------------------------------------------------------------------
-- Usuário C (sem organização) e visitante anônimo: não veem nada.
------------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;

do $$
declare n int; m int; o int;
begin
  select count(*) into n from public.itens;
  select count(*) into m from public.organizacoes;
  select count(*) into o from public.membros;
  if n + m + o <> 0 then raise exception using errcode = 'P0001', message = 'FALHOU 21: usuário sem organização enxergou dados'; end if;
  raise notice 'PASS 21: usuário sem organização não vê itens, organizações nem membros';
end $$;

reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

do $$
begin
  begin
    perform count(*) from public.itens;
    raise exception using errcode = 'P0001', message = 'FALHOU 22: visitante anônimo conseguiu consultar itens';
  exception when insufficient_privilege then
    raise notice 'PASS 22: visitante anônimo não consulta itens (sem permissão)';
  end;
  begin
    perform public.criar_organizacao('anônima');
    raise exception using errcode = 'P0001', message = 'FALHOU 23: visitante anônimo criou organização';
  exception when insufficient_privilege then
    raise notice 'PASS 23: visitante anônimo não executa criar_organizacao';
  end;
end $$;

reset role;
rollback;
\echo
\echo 'Isolamento: todas as verificações passaram. Nenhum dado foi gravado (ROLLBACK).'
