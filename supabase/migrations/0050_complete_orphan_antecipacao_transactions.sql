-- Completa o par das duas transações de "antecipação" que só tinham a
-- perna de entrada no cartão, sem a saída da conta (Itaú, confirmado pelo
-- usuário). Cria a saída faltante, marca as duas pernas como is_transfer +
-- transfer_group_id (mesma receita usada em todos os outros abatimentos já
-- corretos), e liga a entrada como is_invoice_payment=true. O saldo do
-- Itaú é ajustado automaticamente pelo trigger_update_balance ao inserir a
-- saída -- o usuário fará a conciliação manual do saldo depois.

DO $$
DECLARE
  v_group1 uuid := gen_random_uuid();
  v_group2 uuid := gen_random_uuid();
  v_user_id uuid := '5ab1df69-b67f-493c-b4dd-8f7b950049ac';
  v_itau_account_id uuid := '3264d159-b155-419b-bda0-2e500e7e437d';
  v_abatimento_cat_id uuid := 'b9038c6c-13bb-4efa-8f77-4a13c519ec59';
BEGIN
  -- 1) "Antecipação" R$ 40,00 (22/05/2026)
  UPDATE public.transactions
  SET is_transfer = true, is_invoice_payment = true, transfer_group_id = v_group1
  WHERE id = '620980d8-2ca4-454f-b51b-d7ad948fc871';

  INSERT INTO public.transactions (
    user_id, description, amount, type, transaction_type, account_id, card_id,
    date, is_paid, payment_date, is_invoice_payment, invoice_month_year,
    is_transfer, transfer_group_id, category_id
  ) VALUES (
    v_user_id, '[Saída] Antecipação', 40, 'expense', 'punctual', v_itau_account_id, null,
    '2026-05-22', true, '2026-05-22', false, null,
    true, v_group1, v_abatimento_cat_id
  );

  -- 2) "Desconto de Antecipação de Parcelas" R$ 1,69 (22/06/2026)
  UPDATE public.transactions
  SET is_transfer = true, is_invoice_payment = true, transfer_group_id = v_group2
  WHERE id = '77dbbc55-c6f0-4325-a61d-34ec4a429ad7';

  INSERT INTO public.transactions (
    user_id, description, amount, type, transaction_type, account_id, card_id,
    date, is_paid, payment_date, is_invoice_payment, invoice_month_year,
    is_transfer, transfer_group_id, category_id
  ) VALUES (
    v_user_id, '[Saída] Desconto de Antecipação de Parcelas', 1.69, 'expense', 'punctual', v_itau_account_id, null,
    '2026-06-22', true, '2026-06-22', false, null,
    true, v_group2, v_abatimento_cat_id
  );
END $$;
