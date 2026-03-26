-- Script de Atualização Idempotente para o Banco de Dados v2.1 (Fluxo Avançado + Coach Financeiro)
-- Rode isso no SQL Editor do seu projeto Supabase

-- 1. Tabelas de Categorias e Grupos
CREATE TABLE IF NOT EXISTS category_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, 
  description TEXT
);

-- Insere os 3 grupos padrão do 50-30-20
INSERT INTO category_groups (name, description) VALUES 
('needs', 'Gastos essenciais para viver (Moradia, Alimentação Básica, Contas)'),
('wants', 'Gastos com estilo de vida e desejos (Lazer, Delivery, Assinaturas)'),
('savings', 'Dívidas, Investimentos e Reserva de Emergência')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  group_id UUID REFERENCES category_groups(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS subcategories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Regras de Orçamento (Budget Rules)
CREATE TABLE IF NOT EXISTS budget_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  needs_percent INTEGER DEFAULT 50 CHECK (needs_percent BETWEEN 0 AND 100),
  wants_percent INTEGER DEFAULT 30 CHECK (wants_percent BETWEEN 0 AND 100),
  savings_percent INTEGER DEFAULT 20 CHECK (savings_percent BETWEEN 0 AND 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT check_100_percent CHECK (needs_percent + wants_percent + savings_percent = 100)
);

-- 3. Gamificação e Hábitos
CREATE TABLE IF NOT EXISTS user_habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  habit_type TEXT NOT NULL,
  description TEXT,
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES user_habits(id) ON DELETE CASCADE NOT NULL,
  logged_date DATE NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'missed', 'skipped')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(habit_id, logged_date)
);

-- 4. Modificações em tabelas existentes
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'checking' CHECK (account_type IN ('checking', 'savings', 'benefit_vr', 'benefit_va', 'benefit_flex'));

ALTER TABLE debts ADD COLUMN IF NOT EXISTS interest_rate_monthly DECIMAL(5,2) DEFAULT 0;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS minimum_payment DECIMAL(12,2);
ALTER TABLE debts ADD COLUMN IF NOT EXISTS due_day INTEGER CHECK (due_day BETWEEN 1 AND 31);
ALTER TABLE debts ADD COLUMN IF NOT EXISTS strategy_priority INTEGER;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'punctual' CHECK (transaction_type IN ('punctual', 'installment', 'recurring', 'adjustment'));
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_group_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_number INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_total INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_month_year TEXT;

-- 5. Nova tabela Bills
CREATE TABLE IF NOT EXISTS bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('payable', 'receivable')),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'cancelled')),
  is_fixed BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Configuração de RLS (Somente se necessário)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Helper para criar políticas de forma segura (ignora se já existe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own categories') THEN
        CREATE POLICY "Users manage own categories" ON categories FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own subcategories') THEN
        CREATE POLICY "Users manage own subcategories" ON subcategories FOR ALL USING (category_id IN (SELECT id FROM categories WHERE user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own budget_rules') THEN
        CREATE POLICY "Users manage own budget_rules" ON budget_rules FOR ALL USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own habits') THEN
        CREATE POLICY "Users manage own habits" ON user_habits FOR ALL USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own habit logs') THEN
        CREATE POLICY "Users manage own habit logs" ON habit_logs FOR ALL USING (habit_id IN (SELECT id FROM user_habits WHERE user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own bills') THEN
        CREATE POLICY "Users manage own bills" ON bills FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
