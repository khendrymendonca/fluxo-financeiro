# Auditoria do modulo de Orcamentos

Data: 2026-05-14

## Estado atual antes da revisao

- Nao existe tela propria de Orcamentos na navegacao principal.
- O controle esta distribuido em `CategoriesManager`, `ReportsDashboard` e no componente legado `BudgetAlerts`.
- Categorias possuem `budgetGroup` e a UI permite editar `budgetLimit`.
- `useCategoryMutations` grava `budget_limit`, mas `useFinanceQueries` ainda consulta categorias sem `budget_limit` e retorna `budgetLimit: null`.
- `BudgetAlerts` existe apenas no `LegacyDashboardHome`, que nao e a Home atual.
- `ReportsDashboard` ja possui visualizacao por categoria com comparacao contra `budgetLimit`, mas depende do dado estar disponivel.

## Implementacao desta revisao

- O modulo foi colocado como bloco mensal dentro de Relatorios Analiticos, em modo Projetado e com todas as contas selecionadas.
- A unidade principal e a categoria.
- `budgetLimit` da categoria foi adotado como valor planejado mensal, sem criar nova tabela ou migration.
- `useFinanceQueries` passou a carregar `budget_limit` para que os limites gravados em Categorias aparecam nos relatorios.
- O realizado do orcamento usa competencia da compra, inclusive para compras no cartao.
- Pagamento de fatura e ignorado no orcamento por categoria, porque a fatura e forma de pagamento, nao categoria de consumo.
- Transferencias, receitas e transacoes deletadas ficam fora.

## Riscos de regra

- Orcamento por categoria precisa decidir se compara contra despesa efetiva, despesa prevista ou fatura por competencia.
- Compras no cartao nao podem entrar duplicadas junto com fatura.
- A regra de Relatorios e projetada por competencia; a regra de Lancamentos e extrato realizado.
- Mudar Orcamentos agora sem definir essa semantica pode reabrir duplicidade de cartao/fatura.

## Recomendacao

Opcao recomendada: evoluir este bloco para uma aba propria dentro de Relatorios/Planejamento.

Motivo:
- Orcamento e uma leitura analitica e comparativa, nao uma acao operacional como Gestao de Contas.
- Relatorios ja tem agrupamento por categoria, modo projetado/realizado e filtros por periodo.
- A Home pode manter apenas alertas ou atalhos resumidos, sem virar tela de configuracao.
- A navegacao principal fica mais enxuta.
- Quando houver regra por competencia consolidada e historico mensal de metas, o bloco pode virar tela "Planejamento > Orcamentos" sem quebrar a leitura atual.

## Proximos passos sugeridos

1. Definir regra explicita: Orcamento previsto por competencia ou realizado por caixa.
2. Corrigir `useFinanceQueries` para carregar `budget_limit` quando a regra for aprovada.
3. Criar aba "Orcamentos" em Relatorios, reutilizando categorias e limites.
4. Adicionar testes de cartao/fatura para evitar duplicidade.
