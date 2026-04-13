# Log de Alterações Técnicas — Sessão 12/04/2026
**Tech Lead & QA: Gemini CLI**
**Builds Alvos: AB-14 e AB-15**

## 1. src/hooks/useTransactionMutations.ts (Refino de Corte de Série)
**Mudança:** Implementada a lógica de "Split Inteligente" e preservação de histórico.
- **Antes:** Edições 'future' deletavam a transação mãe original.
- **Depois:** Agora a mãe é convertida em pontual (preservando o passado) e a nova série começa na data alvo. Se a edição for no mesmo mês, o sistema apenas atualiza sem fazer o split.

```typescript
// Trecho da lógica de escopo 'future'
const isSameMonthYear = finalDate.slice(0, 7) === rootDate.slice(0, 7);

if (isSameMonthYear) {
  if (!isVirtual) {
    await supabase.from('transactions').update(dbUpdates).eq('id', id);
  } else {
    // Materializa virtual no mesmo mês como pontual sem matar a mãe
    await supabase.from('transactions').insert({
      ...currentTx,
      id: undefined,
      ...dbUpdates,
      date: finalDate,
      original_id: realId,
      is_recurring: false,
      transaction_type: 'punctual'
    });
  }
}
```

## 2. src/hooks/useProjectedTransactions.ts (Trava de Concorrência)
**Mudança:** Blindagem do motor de projeção contra duplicidades durante a baixa.
- **Fim da Trava por Conteúdo:** Removida a comparação por descrição/valor (frágil).
- **Inclusão Estendida:** Agora o motor mantém transações reais de outros meses para fins de comparativo.

```typescript
// Regra de Ouro de Deduplicação
const hasRealEquivalent = realTransactions.some(real =>
  real.originalId === tx.id ||
  (real.id === tx.id && isSameMonth(parseLocalDate(real.date.slice(0, 10)), viewDate))
);

// Inclusão de transações reais para relatórios
if (!tx.isVirtual) {
  if (!projected.some(p => p.id === tx.id)) {
    projected.push(tx);
  }
}
```

## 3. src/components/accounts/BillsManager.tsx (Visão Estritamente Mensal)
**Mudança:** Limpeza visual e funcional da Gestão de Contas.
- **Remoção de Atrasados:** Ocultada a lógica que trazia pendências de meses anteriores para o mês atual.
- **Ocultação de Pagos:** Filhos físicos que já foram pagos são removidos da lista de contas "A Pagar/Receber".

```typescript
// Filtro rigoroso
const isCurrentMonth = (txDate.getMonth() === viewDate.getMonth() && txDate.getFullYear() === viewDate.getFullYear());
if (!isCurrentMonth) return false;

// Não poluir com o que já foi liquidado
if (t.originalId && t.isPaid) return false;
```

## 4. src/pages/ReportsDashboard.tsx (Relatórios Analíticos 2.0)
**Mudança:** Reformulação completa da UX/UI e do Motor de Dados.
- **Design Escultural:** Containers `rounded-[2.5rem]`, tipografia Black e cards com efeito de escala.
- **Motor Multimeses:** Criada a função `getPeriodData` para simular projeções em meses passados e futuros para comparativos.
- **Receitas Recorrentes:** Adicionado suporte a `income` recorrente (Salários).
- **Gráfico Comparativo:** Barras duplas (Receita vs Despesa) com cálculo de saldo no Tooltip.

```typescript
// Novo motor de dados do Dashboard
const getPeriodData = useCallback((start: Date, end: Date) => {
  // Simula projeções de fixas para qualquer intervalo de datas
  // Retorna { total, fixed, paid, income }
}, [transactions, categories, selectedAccountId]);
```

## 5. src/pages/Index.tsx (Fidelidade do Extrato)
**Mudança:** Filtro de visibilidade para transações pendentes.
- **Regra:** O Extrato agora exibe apenas transações liquidadas (`isPaid: true`), separando o operacional (Gestão de Contas) do realizado.

```typescript
<TransactionList
  transactions={currentMonthTransactions.filter(t => t.isPaid)}
  onEdit={handleEditTransaction}
/>
```

## 6. src/hooks/useFinanceQueries.ts (Expansão de Query)
**Mudança:** Eliminação do "Ponto Cego" de dados.
- **Nova Cláusula SQL:** A query agora busca todos os `original_id.not.is.null`, garantindo que o motor de projeção saiba que um registro físico foi criado mesmo que ele esteja fora da janela de datas padrão.

```typescript
.or(
  `and(deleted_at.is.null,date.gte.${windowStart},date.lte.${windowEnd}),` + 
  `is_recurring.eq.true,` +
  `installment_group_id.not.is.null,` +
  `original_id.not.is.null` // Garantia de materialização
);
```

---
**Status da Seção:** Finalizada com estabilidade.
**QA Pass:** Testes unitários preservados e bugs de duplicidade de salário debelados na camada de motor.
