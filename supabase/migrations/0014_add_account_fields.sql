-- Adiciona colunas para agrupamento e detalhamento de contas
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS institution TEXT DEFAULT 'Outros',
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'Corrente';

-- Comentários para documentação
COMMENT ON COLUMN accounts.institution IS 'Nome da instituição financeira (ex: Itaú, Nubank)';
COMMENT ON COLUMN accounts.account_type IS 'Tipo da conta (ex: Corrente, Poupança, Investimento)';
