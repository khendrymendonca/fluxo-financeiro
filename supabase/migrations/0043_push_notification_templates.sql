-- Migration: 0043_push_notification_templates.sql
-- Description: Cria a tabela para armazenar os templates de notificações contendo o horário de envio personalizado.

CREATE TABLE IF NOT EXISTS public.push_notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('bills_due', 'goals_reached', 'budget_limits', 'card_closing', 'daily_reminder')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    send_time TEXT DEFAULT NULL, -- Horário de envio (ex: '09:00', '18:00', NULL para instantâneos)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.push_notification_templates ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança (RLS)
CREATE POLICY "Anyone can view push notification templates"
    ON public.push_notification_templates
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Super admin has full control over templates"
    ON public.push_notification_templates
    FOR ALL
    TO authenticated
    USING (auth.uid() = '5ab1df69-b67f-493c-b4dd-8f7b950049ac')
    WITH CHECK (auth.uid() = '5ab1df69-b67f-493c-b4dd-8f7b950049ac');

-- Inserir templates iniciais com horários padrão
INSERT INTO public.push_notification_templates (type, title, body, send_time) VALUES
('bills_due', 'Fluxo', 'Sua despesa "{description}" no valor de {amount} vence amanhã. Não se esqueça! 💸', NULL),
('goals_reached', 'Fluxo', 'Parabéns! Você atingiu 100% da sua meta "{name}" ({target_amount})! 🏆', NULL),
('budget_limits', 'Fluxo', 'Atenção: Os seus gastos em "{category}" atingiram {percentage}% do limite. ⚠️', NULL),
('card_closing', 'Fluxo', 'A fatura do seu cartão "{card_name}" fechou hoje com o valor de {amount}. 💳', '08:00'),
('daily_reminder', 'Fluxo', 'Hora do check-in financeiro! Já lançou suas despesas do almoço? ☕️', '12:00'),
('daily_reminder', 'Fluxo', 'Já lançou suas despesas de hoje? Não perca tempo, depois acumula tudo! 🫣', '18:00')
ON CONFLICT DO NOTHING;
