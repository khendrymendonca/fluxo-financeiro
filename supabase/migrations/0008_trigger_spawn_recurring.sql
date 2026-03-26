-- Script para Geração Automática de Próxima Ocorrência (Lazy Generation)
-- Objetivo: Quando uma transação recorrente é paga, cria-se automaticamente a do mês seguinte.

-- 1. Função de trigger
CREATE OR REPLACE FUNCTION spawn_next_recurring_transaction()
RETURNS TRIGGER AS $$
DECLARE
    next_date DATE;
BEGIN
    -- Só age se o status is_paid mudar de false para true e for uma transação recorrente
    IF (OLD.is_paid = false AND NEW.is_paid = true) AND 
       (NEW.transaction_type = 'recurring' OR NEW.is_recurring = true) THEN
        
        -- Calcula a próxima data (padrão 1 mês)
        -- TODO: No futuro, honrar o campo NEW.recurrence se houver 'weekly', etc.
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
            created_at,
            updated_at
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
            NOW(),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Criação do Trigger
DROP TRIGGER IF EXISTS tr_spawn_recurring ON transactions;
CREATE TRIGGER tr_spawn_recurring
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION spawn_next_recurring_transaction();
