# Roteiro de teste de isolamento

Objetivo: provar que um usuário da organização A não lê (nem altera) itens da organização B.

## Nível 1: SQL puro (roda em qualquer PostgreSQL, sem Docker)

    npm run test:isolamento:sql

Cria um cluster temporário, imita o schema `auth` (`supabase/tests/stub_auth.sql`), aplica as migrações e roda `supabase/tests/isolamento.sql` (23 verificações, termina em ROLLBACK). Prova as políticas e funções. Não prova o Auth real.

## Nível 2: Supabase local (Auth real)

1. `supabase start` (precisa de Docker). Anote a URL e a chave publicável em `supabase status`.
2. `supabase db reset` (aplica as migrações).
3. `SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_PUBLISHABLE_KEY=<chave> npm run test:isolamento`

Resultado esperado: todas as linhas PASS e "Isolamento confirmado".

## Nível 3: manual, pela interface

1. `npm run dev`. Em uma janela normal, crie a conta `a@exemplo.test`, crie a organização "A" e clique em "Carregar dados demonstrativos".
2. Em janela anônima, crie `b@exemplo.test` e a organização "B". Ela deve abrir sem itens.
3. No console do navegador da janela B, com o cliente Supabase da página, tente ler `itens` filtrando pelo `org_id` de A (pegue o id no Studio local, tabela `organizacoes`). Esperado: lista vazia, sem erro.
4. No Studio local (http://127.0.0.1:54323), confira em Authentication > Policies que as 3 tabelas têm RLS ligada.

## Critério de aceite

Qualquer linha FALHOU, ou leitura de item de outra organização, bloqueia a publicação.
