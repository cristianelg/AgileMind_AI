# AgileMind AI

Camada de inteligência para Agile Masters, Scrum Masters, POs e líderes de engenharia.
Não é um gerenciador de tarefas.

Promessa do MVP: identificar os três maiores riscos da sprint e indicar as ações antes que prejudiquem a entrega.

## Estado atual (incremento 2)

Projeto Vite + React + Tailwind + Recharts, pronto para deploy no Vercel.

- `src/App.jsx`: cabeçalho com seletor de time, faixa "Dados demonstrativos · não são dados reais" e três abas (Dashboard Gerencial, Radar de Riscos, Agile Coach), ainda com texto de apresentação.
- `src/dados/csv.js`: converte o CSV em lista de objetos.
- `dados/itens_demo.csv`: dados demonstrativos (UTF-8), 29 itens de 2 times.

## Como rodar

```
npm install
npm run dev      # desenvolvimento
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
