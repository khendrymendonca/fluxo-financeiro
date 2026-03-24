-- Adiciona colunas faltantes para o funcionamento da criaÃ§Ã£o e ediÃ§Ã£o de CartÃµes de CrÃ©dito
ALTER TABLE credit_cards
ADD COLUMN is_closing_date_fixed BOOLEAN DEFAULT true,
ADD COLUMN is_active BOOLEAN DEFAULT true;


