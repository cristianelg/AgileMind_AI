# AgileMind AI (projeto real)

Vite + React + TypeScript + Tailwind + Recharts, com Supabase (Auth + PostgreSQL com RLS) e uma Edge Function que chama o modelo de IA. O protótipo publicado continua na raiz do repositório, intocado.

## Estrutura

    src/core/                 motor de métricas e regras de risco (funções puras, sem interface)
    src/core/__tests__/       testes de aceite P2 (métricas) e P5 (riscos)
    src/lib/                  cliente Supabase, itens, chamada à função de análise
    src/App.tsx               login, organização, painel mínimo
    dados/itens_demo.csv      dados demonstrativos (29 itens)
    supabase/migrations/      tabelas, RLS e funções
    supabase/tests/           teste de isolamento em SQL
    supabase/functions/analisar/   Edge Function (handler.ts testável, index.ts em Deno)
    scripts/teste-isolamento.mjs   teste de isolamento via supabase-js (stack local)
    docs/ROTEIRO_ISOLAMENTO.md     roteiro de teste de isolamento

## Rodar localmente

    npm install
    npm test                       # núcleo + handler da função (23 testes)
    npm run typecheck
    npm run test:isolamento:sql    # migrações + 23 verificações de RLS em Postgres descartável

Com Docker e a CLI do Supabase:

    supabase init                  # uma vez; cria supabase/config.toml
    supabase start
    supabase db reset              # aplica as migrações
    cp .env.example .env.local     # preencha URL e chave publicável de `supabase status`
    npm run dev
    npm run test:isolamento        # precisa das variáveis SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY

Edge Function:

    cp supabase/functions/.env.example supabase/functions/.env   # ANTHROPIC_API_KEY e MODELO_IA
    supabase functions serve analisar --env-file supabase/functions/.env
    # em produção: supabase secrets set ANTHROPIC_API_KEY=... MODELO_IA=...
    #              supabase functions deploy analisar

A chave nunca vai para o front-end: só `VITE_SUPABASE_URL` e a chave publicável têm prefixo `VITE_`.

## Estado do que foi verificado

| Item | Estado |
| --- | --- |
| Testes de aceite P2 e P5 do núcleo (Vitest) | executado, passando |
| Migrações + 23 verificações de isolamento em PostgreSQL 16 com `auth` imitado | executado, passando |
| `tsc --noEmit` e `npm run build` | executado, sem erros |
| Handler da Edge Function (validação, montagem da requisição) | executado, passando |
| Supabase local, Auth real, `scripts/teste-isolamento.mjs` | NÃO executado (sem Docker no ambiente de desenvolvimento) |
| Edge Function rodando em Deno, chamada real ao modelo | NÃO executado |
| Tela do painel no navegador | NÃO executado (só compilada) |

## O que conferir na documentação atual (não assumi)

1. Modelo de IA: o nome vem do secret `MODELO_IA`, sem valor fixo no código. Confira a lista de modelos vigente na documentação da Anthropic.
2. API de mensagens: endpoint, valor do cabeçalho `anthropic-version`, formato do corpo e da resposta. Estão em `handler.ts` (`ENDPOINT_MENSAGENS`, `VERSAO_API`, `extrairTexto`), escritos de memória.
3. CLI do Supabase: comandos e flags de `init`, `start`, `db reset`, `functions serve --env-file`, `secrets set`, `functions deploy`, e se `supabase status` ainda mostra a chave com o nome esperado.
4. Chaves: nome atual da chave de uso no navegador (publicável vs `anon`) e variável de ambiente que a Edge Function recebe (`SUPABASE_ANON_KEY` em `index.ts` é suposição).
5. `verify_jwt` das funções no `config.toml` e como o gateway valida o JWT na sua versão. A função também valida o usuário por conta própria.
6. Auth local: se a confirmação de e-mail está desligada (o script de isolamento depende disso) e a URL do Inbucket/Mailpit, se ligada.
7. `import` de `npm:@supabase/supabase-js@2` e `Deno.serve` no runtime de funções vigente.
8. Versões muito novas instaladas pelo `npm install`: React 19.3, Recharts 3, TypeScript 7, Vite 8, Vitest 5. O build passou, mas confira notas de migração se algo se comportar diferente do protótipo (React 18, Recharts 2).
9. Políticas: a sintaxe de `(select auth.uid())` e `set search_path = ''` segue o guia de RLS atual do Supabase; confirme no guia.

## Pendências conhecidas

- Texto oficial do prompt de análise (`supabase/functions/analisar/prompt.ts`): a função recusa a chamada (HTTP 503) enquanto `PROMPT_PENDENTE` for true.
- Validação linha a linha da importação de CSV ainda não foi portada para TypeScript.
- Convite de membros e troca de papéis: não há política de escrita em `membros`/`organizacoes`; quem cria a organização vira dono pela função `criar_organizacao`.
- Planos PDCA e anotações do protótipo ainda não têm tabela.
