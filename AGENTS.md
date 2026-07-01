# REGRA OBRIGATÓRIA — ENCODING E TEXTOS VISÍVEIS

- Todos os arquivos devem ser UTF-8.
- Textos visíveis ao usuário não podem conter mojibake.
- Nunca finalizar sprint com caracteres como `�`, `Ã§`, `Ã£`, `Ãµ`, `â€`, `N�`, `1�` em labels, botões, placeholders, tooltips, títulos ou mensagens.
- Rodar `npm run check:encoding` antes do fechamento.
- Corrigir manualmente textos quebrados; não fazer conversão automática cega em arquivo inteiro.
- Se houver falso positivo legítimo, adicionar allowlist pequena e justificada no script.

# FILOSOFIA E CERNE DO PROJETO 'FLUXO'

- **Comportamento de Extrato (Regime de Caixa)**:
  - O aplicativo se comporta como uma carteira/extrato bancário. O que importa é quando o dinheiro de fato entrou ou saiu da conta (data de baixa/pagamento).
  - Despesas e receitas normais (não-cartão de crédito) devem ser contabilizadas e exibidas de acordo com sua data de baixa (`paymentDate`), caso estejam pagas. A data de vencimento/nominal é apenas uma referência.
  - Para cartão de crédito, o valor da parcela é baixado e contabilizado ao pagar a fatura do mês correspondente (`invoiceMonthYear`).
- **Gestor Inteligente e Simplificado**:
  - O projeto é focado em controle financeiro doméstico simplificado.
  - A tela de relatórios deve permitir ao usuário acompanhar e mensurar seus gastos de forma clara (ex: conta de luz, gastos com padaria) para planejar sua liberdade financeira.
  - Não introduzir complexidades desnecessárias ou recursos não solicitados pelo usuário que fujam desse cerne simplificado.
