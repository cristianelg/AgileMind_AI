# AgileMind AI

Camada de inteligência para Agile Masters, Scrum Masters, POs e líderes de engenharia.
Não é um gerenciador de tarefas.

Promessa do MVP: identificar os três maiores riscos da sprint e indicar as ações antes que prejudiquem a entrega.

## Estado atual (incremento 1)

- `agilemind-ai.html`: página única em React + Tailwind (via CDN) com cabeçalho, seletor de time, faixa "Dados demonstrativos · não são dados reais" e três abas (Dashboard Gerencial, Radar de Riscos, Agile Coach), ainda com texto de apresentação.
- `dados/itens_demo.csv`: dados demonstrativos (UTF-8), 29 itens de 2 times.

## Regras de arquitetura

1. Métricas calculadas por funções puras e determinísticas, nunca por IA.
2. A data de referência é sempre um parâmetro.
3. Riscos nascem de regras explícitas e configuráveis.
4. A IA só interpreta resultados já calculados e separa evidência de hipótese.
5. Dados de demonstração sempre identificados.
6. Nenhuma credencial ou chave de API no front-end.
