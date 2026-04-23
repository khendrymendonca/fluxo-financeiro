-- ==========================================================
-- SCRIPT DE MODERNIZAÇÃO DO BANCO DE DADOS (MVP) - CORRIGIDO V4
-- Conteúdo: Soft Delete + Migração de Bills + Lazy Generation
-- ==========================================================

BEGIN;

-- 1. PREPARAÇÃO DO SCHEMA (Tabela Transactions)
-- Garante que as colunas legadas não bloqueiem a migração
ALTER TABLE transactions ALTER COLUMN category DROP NOT NULL;

-- Adicionar coluna de Soft Delete (Exclusão Lógica)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='deleted_at') THEN
        ALTER TABLE transactions ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    END IF;
END $$;

-- 2. MIGRAÇÃO DE DADOS (Bills -> Transactions)
-- Transfere todas as contas fixas para a tabela única de transações se elas existirem
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bills') THEN
        INSERT INTO transactions (
          description,
          amount,
          date,
          category_id,
          subcategory_id,
          user_id,
          account_id,
          card_id,
          type,
          is_paid,
          payment_date,
          is_recurring,
          transaction_type,
          deleted_at,
          created_at
        )
        SELECT 
          name as description,
          amount,
          COALESCE(due_date, NOW()) as date,
          category_id,
          subcategory_id,
          user_id,
          account_id,
          card_id,
          CASE WHEN type = 'receivable' THEN 'income' ELSE 'expense' END as type,
          CASE WHEN status = 'paid' THEN true ELSE false END as is_paid,
          payment_date,
          true as is_recurring,
          'recurring' as transaction_type,
          NULL as deleted_at,
          created_at
        FROM bills;
    END IF;
END $$;

-- 3. MOTOR DE RECORRÊNCIA (Lazy Generation)
-- Cria a função de trigger que gera a próxima transação ao pagar a atual
CREATE OR REPLACE FUNCTION spawn_next_recurring_transaction()
RETURNS TRIGGER AS $$
DECLARE
    next_date DATE;
BEGIN
    -- Só age se o status is_paid mudar de false para true e for uma transação recorrente
    -- E se a transação não estiver marcada como excluída
    IF (OLD.is_paid = false AND NEW.is_paid = true) AND 
       (NEW.transaction_type = 'recurring' OR NEW.is_recurring = true) AND
       (NEW.deleted_at IS NULL) THEN
        
        -- Calcula a próxima data (padrão 1 mês)
        next_date := NEW.date + INTERVAL '1 month';

        -- Insere a nova transação clonando os dados da atual
        INSERT INTO transactions (
            user_id,
            description,
            amount,
            type,
            transaction_type,
            category_id,
            subcategory_id,
            account_id,
            card_id,
            date,
            is_paid,
            installment_group_id,
            is_recurring,
            recurrence,
            is_automatic,
            created_at
        ) VALUES (
            NEW.user_id,
            NEW.description,
            NEW.amount,
            NEW.type,
            NEW.transaction_type,
            NEW.category_id,
            NEW.subcategory_id,
            NEW.account_id,
            NEW.card_id,
            next_date,
            false, -- Próxima começa como não paga
            NEW.installment_group_id,
            NEW.is_recurring,
            NEW.recurrence,
            NEW.is_automatic,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criação do Trigger
DROP TRIGGER IF EXISTS tr_spawn_recurring ON transactions;
CREATE TRIGGER tr_spawn_recurring
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION spawn_next_recurring_transaction();

-- 4. LIMPEZA (Remover tabela antiga)
DROP TABLE IF EXISTS bills CASCADE;

COMMIT;
