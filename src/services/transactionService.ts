import { supabase } from '@/lib/supabase';
import { parseISO } from 'date-fns';
import { calcInvoiceMonthYear, getCardSettingsForDate } from '@/utils/creditCardUtils';

interface AnticipatePaymentParams {
  cardId: string;
  accountId: string;
  amount: number;
  date: string; // ISO format YYYY-MM-DD
  userId: string;
}

/**
 * Realiza o abatimento/adiantamento de fatura de cartão de crédito.
 * Segue a regra de negócio estrita de dois inserts separados:
 * 1. Débito na tabela 'transactions' (origem bancária).
 * 2. Crédito na tabela 'bills' (destino cartão/fatura).
 */
export async function anticipateCardPayment({
  cardId,
  accountId,
  amount,
  date,
  userId
}: AnticipatePaymentParams): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Buscar detalhes do cartão para calcular a competência (invoiceMonthYear)
    const { data: card, error: cardError } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (cardError || !card) {
      throw new Error('Cartão não encontrado para processar o abatimento.');
    }

    // 2. Calcular a competência da fatura (Regra de Fechamento)
    const paymentDate = parseISO(date);
    const settings = getCardSettingsForDate(card, paymentDate);
    const invoiceMonthYear = calcInvoiceMonthYear(paymentDate, settings);

    // 3. INSERT 1: Débito na conta bancária (Tabela transactions)
    const { error: debitError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: accountId,
        description: `Abatimento de Fatura: ${card.name}`,
        amount: amount,
        type: 'expense',
        transaction_type: 'punctual',
        date: date,
        is_paid: true,
        payment_date: date,
        category_id: 'card-payment'
      });

    if (debitError) throw debitError;

    // 4. INSERT 2: Crédito na fatura do cartão (Tabela bills)
    // De acordo com a regra estrita do usuário: type: 'income', is_invoice_payment: true
    const { error: creditError } = await supabase
      .from('bills')
      .insert({
        user_id: userId,
        card_id: cardId,
        description: `Abatimento de Fatura (Crédito)`,
        amount: amount,
        type: 'income',
        is_paid: true,
        payment_date: date,
        is_invoice_payment: true,
        invoice_month_year: invoiceMonthYear,
        category_id: 'card-payment'
      });

    if (creditError) throw creditError;

    return { success: true };
  } catch (error: any) {
    console.error('[anticipateCardPayment] Failure:', error);
    return { 
      success: false, 
      error: error.message || 'Falha ao processar abatimento de fatura.' 
    };
  }
}
