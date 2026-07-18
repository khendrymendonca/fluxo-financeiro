import fs from 'fs';
import path from 'path';
import readline from 'readline';

const csvFilePath = 'C:\\Users\\khendry.mendonca\\Downloads\\transactions_rows (1).csv';
const myUserId = '5ab1df69-b67f-493c-b4dd-8f7b950049ac';

async function run() {
  const fileStream = fs.createReadStream(csvFilePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let headers = [];
  const rows = [];
  let isFirst = true;

  for await (const line of rl) {
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);

    if (isFirst) {
      headers = parts.map(h => h.trim());
      isFirst = false;
    } else {
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx] ? parts[idx].trim() : '';
      });
      rows.push(row);
    }
  }

  // Filtrar transações de Junho de 2026 (não deletadas) do meu user_id
  const myJuneTxs = rows.filter(t => {
    if (t.deleted_at && t.deleted_at !== 'null' && t.deleted_at !== '') return false;
    const dateStr = t.date;
    const isJune = dateStr && dateStr.startsWith('2026-06');
    const isMine = t.user_id === myUserId;
    return isJune && isMine;
  });

  console.log(`=== TRANSAÇÕES DE JUNHO 2026 DO MEU USUÁRIO (${myJuneTxs.length} ativas) ===`);

  // Lógica de despesa do relatório:
  // type === 'expense' && isPaid && !isTransfer && (isInvoicePayment || !cardId)
  const reportExpenses = myJuneTxs.filter(t => {
    const isPaid = t.is_paid === 'true';
    const isTransfer = t.is_transfer === 'true';
    const cardId = t.card_id;
    const isInvoicePayment = t.is_invoice_payment === 'true';
    return t.type === 'expense' && isPaid && !isTransfer && (isInvoicePayment || !cardId);
  });

  // Lógica de receita do relatório:
  // type === 'income' && isPaid && !isTransfer
  const reportIncomes = myJuneTxs.filter(t => {
    const isPaid = t.is_paid === 'true';
    const isTransfer = t.is_transfer === 'true';
    return t.type === 'income' && isPaid && !isTransfer;
  });

  let sumIncome = 0;
  console.log("\nRECEITAS DO MEU USUÁRIO NO RELATÓRIO:");
  reportIncomes.forEach(t => {
    console.log(`  - [${t.date.split(' ')[0]}] ${t.description}: R$ ${t.amount} (Conta: ${t.account_id})`);
    sumIncome += parseFloat(t.amount);
  });

  let sumExpense = 0;
  console.log("\nDESPESAS DO MEU USUÁRIO NO RELATÓRIO:");
  reportExpenses.forEach(t => {
    console.log(`  - [${t.date.split(' ')[0]}] ${t.description}: R$ ${t.amount} (Conta: ${t.account_id}, CardId: ${t.card_id}, Fatura: ${t.is_invoice_payment})`);
    sumExpense += parseFloat(t.amount);
  });

  console.log(`\nSoma das Receitas: R$ ${sumIncome.toFixed(2)}`);
  console.log(`Soma das Despesas: R$ ${sumExpense.toFixed(2)}`);
  console.log(`Saldo Líquido (Receitas - Despesas): R$ ${(sumIncome - sumExpense).toFixed(2)}`);

  // E quais são as contas do meu usuário?
  // Vamos ver o saldo inicial e final acumulado em Junho de cada conta corrente dele
  // As contas dele são:
  // Itaú (3264d159-b155-419b-bda0-2e500e7e437d)
  // Alymente Flex (595fc5be-0411-4fa3-b91e-edbf8e7d17f1)
  // Alymente Alimentação (4b2191f0-94a6-4dd1-a400-daccc21f8fc9)
  // Nubank (b222970b-0b8c-4024-8a23-e540b83c884e)
  // Inter/C6 (9805e94c-7dc6-4820-843f-915a29f13bf7)
  // Outra (b3c01a5d-fb7f-41c7-9447-3d54b80d4599)
  
  const accountIds = [
    '3264d159-b155-419b-bda0-2e500e7e437d',
    '595fc5be-0411-4fa3-b91e-edbf8e7d17f1',
    '4b2191f0-94a6-4dd1-a400-daccc21f8fc9',
    'b222970b-0b8c-4024-8a23-e540b83c884e',
    '9805e94c-7dc6-4820-843f-915a29f13bf7',
    'b3c01a5d-fb7f-41c7-9447-3d54b80d4599'
  ];

  console.log("\n=== SALDOS ACUMULADOS DE CADA CONTA DO MEU USUÁRIO EM JUNHO ===");
  accountIds.forEach(accId => {
    const accTxs = rows.filter(t => {
      if (t.deleted_at && t.deleted_at !== 'null' && t.deleted_at !== '') return false;
      return t.account_id === accId && t.user_id === myUserId;
    });

    const beforeJune = accTxs.filter(t => t.date < '2026-06-01');
    let balBefore = 0;
    beforeJune.forEach(t => {
      const amount = parseFloat(t.amount);
      if (t.is_paid === 'true') {
        if (t.type === 'income') balBefore += amount;
        else balBefore -= amount;
      }
    });

    const duringJune = accTxs.filter(t => t.date.startsWith('2026-06') && t.is_paid === 'true');
    let juneNet = 0;
    duringJune.forEach(t => {
      const amount = parseFloat(t.amount);
      if (t.type === 'income') juneNet += amount;
      else juneNet -= amount;
    });

    console.log(`Conta ID ${accId.slice(0, 8)}...: Inicial: R$ ${balBefore.toFixed(2)} | Net Junho: R$ ${juneNet.toFixed(2)} | Final Junho: R$ ${(balBefore + juneNet).toFixed(2)}`);
  });
}

run();
