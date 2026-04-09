-- ============================================================
-- MIGRAÇÃO: RLS COMPLETO — FLUXO FINANCEIRO
-- Data: 09/04/2026
-- Objetivo: Garantir isolamento total de dados por usuário
-- ============================================================

-- 1. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_rules      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. REMOVER POLÍTICAS ANTIGAS (evitar conflito)
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I',
      r.policyname, r.tablename
    );
  END LOOP;
END $$;

-- ============================================================
-- 3. TABELA: transactions
-- ============================================================
CREATE POLICY "transactions: select próprio"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "transactions: insert próprio"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions: update próprio"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions: delete próprio"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. TABELA: accounts
-- ============================================================
CREATE POLICY "accounts: select próprio"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "accounts: insert próprio"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "accounts: update próprio"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "accounts: delete próprio"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. TABELA: categories
-- ============================================================
CREATE POLICY "categories: select próprio"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "categories: insert próprio"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories: update próprio"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories: delete próprio"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. TABELA: subcategories
-- ============================================================
CREATE POLICY "subcategories: select próprio"
  ON subcategories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM categories
      WHERE categories.id = subcategories.category_id
        AND categories.user_id = auth.uid()
    )
  );

CREATE POLICY "subcategories: insert próprio"
  ON subcategories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM categories
      WHERE categories.id = subcategories.category_id
        AND categories.user_id = auth.uid()
    )
  );

CREATE POLICY "subcategories: update próprio"
  ON subcategories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM categories
      WHERE categories.id = subcategories.category_id
        AND categories.user_id = auth.uid()
    )
  );

CREATE POLICY "subcategories: delete próprio"
  ON subcategories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM categories
      WHERE categories.id = subcategories.category_id
        AND categories.user_id = auth.uid()
    )
  );

-- ============================================================
-- 7. TABELA: credit_cards
-- ============================================================
CREATE POLICY "credit_cards: select próprio"
  ON credit_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "credit_cards: insert próprio"
  ON credit_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "credit_cards: update próprio"
  ON credit_cards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "credit_cards: delete próprio"
  ON credit_cards FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 8. TABELA: debts
-- ============================================================
CREATE POLICY "debts: select próprio"
  ON debts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "debts: insert próprio"
  ON debts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "debts: update próprio"
  ON debts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "debts: delete próprio"
  ON debts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 9. TABELA: savings_goals
-- ============================================================
CREATE POLICY "savings_goals: select próprio"
  ON savings_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "savings_goals: insert próprio"
  ON savings_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "savings_goals: update próprio"
  ON savings_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "savings_goals: delete próprio"
  ON savings_goals FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 10. TABELA: budget_rules
-- ============================================================
CREATE POLICY "budget_rules: select próprio"
  ON budget_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "budget_rules: insert próprio"
  ON budget_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "budget_rules: update próprio"
  ON budget_rules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "budget_rules: delete próprio"
  ON budget_rules FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 11. AJUSTE DE SEGURANÇA: Triggers
-- Redefinir a função de trigger com SECURITY DEFINER para que ela
-- possa inserir a próxima recorrência mesmo com RLS ativo.
-- ============================================================
ALTER FUNCTION spawn_next_recurring_transaction() SECURITY DEFINER;