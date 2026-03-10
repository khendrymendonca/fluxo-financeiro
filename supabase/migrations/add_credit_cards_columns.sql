-- Adiciona colunas faltantes para o funcionamento da criação e edição de Cartões de Crédito
ALTER TABLE credit_cards
ADD COLUMN is_closing_date_fixed BOOLEAN DEFAULT true,
ADD COLUMN is_active BOOLEAN DEFAULT true;
