# AgileMind AI

Camada de inteligência para Agile Masters, Scrum Masters, POs e líderes de engenharia.
Não é um gerenciador de tarefas.

Promessa do MVP: identificar os três maiores riscos da sprint e indicar as ações antes que prejudiquem a entrega.

## Estado atual (incremento 4)

Projeto Vite + React + Tailwind + Recharts, publicado no Vercel.

- `src/metricas/`: motor de métricas em funções puras, sem interface e sem relógio do sistema.
  - `datas.js`: datas como dias de calendário (AAAA-MM-DD convertido por `Date.UTC`, sem fuso).
  - `metricas.js`: `wip`, `cycleTime`, `leadTime`, `throughput(janelaDias)`, `aging`, `percentil85`. A data de referência é parâmetro de todas, exceto `percentil85`, que recebe só números.
  - `index.js`: `calcularTime`, que junta tudo e devolve também os valores por item.
  - `dashboard.js`: `calcularDashboard`, com tudo o que a aba Dashboard Gerencial mostra (cartões, série semanal e dispersão), calculado só com o motor.
  - `aceite.test.js` e `dashboard.test.js`: testes com o CSV demonstrativo e data de referência 2026-10-13.
- `src/componentes/Dashboard.jsx`, `CartaoMetrica.jsx`, `Graficos.jsx`: aba Dashboard Gerencial, com cartões (cada um com um "?" que mostra a fórmula), gráfico de throughput semanal em barras e dispersão do Cycle Time com linha do P85 (Recharts). A interface só formata os valores do motor.
- `src/componentes/PainelCalculos.jsx`: botão "Ver cálculos", com cada item, suas datas e os valores calculados, mais o passo a passo de cada métrica.
- `src/App.jsx`: cabeçalho, seletor de time, faixa "Dados demonstrativos · não são dados reais", três abas (ainda com texto de apresentação) e tabela de itens.
- `dados/itens_demo.csv`: dados demonstrativos (UTF-8), 29 itens de 2 times.

### Definições usadas

- WIP: `iniciado_em` preenchido e sem `concluido_em` na data de referência. Item iniciado depois da referência não entra; item concluído depois dela ainda estava em WIP.
- Cycle Time: `concluido_em − iniciado_em`, dias corridos. Lead Time: `concluido_em − criado_em`. Só entram itens concluídos até a referência.
- Aging: data de referência − `iniciado_em`, para os itens em WIP.
- P85: nearest-rank, posição ⌈0,85 × n⌉ da lista ordenada, calculada em inteiros.
- Throughput: itens com `concluido_em` na janela de N dias corridos que termina na data de referência, incluindo-a (N = 28: de 2026-09-16 a 2026-10-13). Esta definição não está nas instruções do Projeto, é uma suposição a confirmar.

### Decisões do Dashboard

- Filtros: time (seletor do topo), tipo (todos, história, bug) e período (todo o período, 14, 28 ou 60 dias corridos até a data de referência). Limite de WIP configurável, padrão 5.
- O período vale para Cycle Time e gráficos (itens concluídos nele). WIP e throughput de 28 dias não seguem o período. O cartão de bugs ignora o filtro de tipo.
- Semana de segunda a domingo, identificada pela segunda-feira. A semana em andamento e a primeira semana de um período recortado aparecem como parciais.
- Rótulos e números em pt-BR, com vírgula decimal.

## Como rodar

```
npm install
npm run dev      # desenvolvimento
npm test         # testes de aceite das métricas
npm run build    # build de produção em dist/
```

No Vercel: framework Vite, comando `npm run build`, pasta de saída `dist`.

## Regras de arquitetura

1. Métricas calculadas por funções puras e determinísticas, nunca por IA.
2. A data de referência é sempre um parâmetro.
3. Riscos nascem de regras explícitas e configuráveis.
4. A IA só interpreta resultados já calculados e separa evidência de hipótese.
5. Dados de demonstração sempre identificados.
6. Nenhuma credencial ou chave de API no front-end.
