import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import webpush from "npm:web-push"

// Único usuário autorizado a disparar push (mesmo ID usado nas policies/RPCs de super admin).
const SUPER_USER_ID = '5ab1df69-b67f-493c-b4dd-8f7b950049ac';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

serve(async (req) => {
  // Trata OPTIONS para o preflight request do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ── SEGURANÇA: exige um usuário autenticado e restringe o disparo
    // de push ao Super Admin. Antes desta checagem, qualquer pessoa de
    // posse da anon key (pública por natureza em qualquer app client-side)
    // conseguia mandar push para todos os usuários ou para um userId
    // arbitrário, já que a função rodava com a service role sem validar
    // quem estava chamando.
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!jwt) {
      return jsonResponse(401, { error: 'Não autenticado.' });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();

    if (userError || !userData?.user || userData.user.id !== SUPER_USER_ID) {
      return jsonResponse(403, { error: 'Acesso negado: apenas o Super Admin pode disparar notificações.' });
    }

    // Configurações do VAPID — precisam estar definidas como secrets da função
    // (supabase secrets set WEBPUSH_PUBLIC_KEY=... WEBPUSH_PRIVATE_KEY=...).
    // Sem fallback hardcoded: uma chave antiga vazou publicamente no
    // histórico do Git e foi revogada; não reintroduzir valores fixos aqui.
    const vapidPublicKey = Deno.env.get('WEBPUSH_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('WEBPUSH_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('WEBPUSH_PUBLIC_KEY / WEBPUSH_PRIVATE_KEY não configuradas nos secrets da função.');
      return jsonResponse(500, { error: 'Configuração de push ausente no servidor.' });
    }

    webpush.setVapidDetails(
      'mailto:suporte@fluxofinanceiro.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    const { userId, broadcast, title, body: pushBody, type, url } = body;

    if (!pushBody) {
      return jsonResponse(400, { error: 'O corpo da mensagem (body) é obrigatório.' });
    }

    // Busca as assinaturas no banco de dados
    let query = supabase.from('push_subscriptions').select('*');

    if (!broadcast && userId && userId !== 'all') {
      query = query.eq('user_id', userId);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return jsonResponse(200, { success: true, message: 'Nenhuma assinatura ativa encontrada para envio.' });
    }

    const payload = JSON.stringify({
      title: title || 'Fluxo',
      body: pushBody,
      type: type || 'daily_reminder',
      url: url || '/'
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        return { endpoint: sub.endpoint, success: true };
      } catch (err: any) {
        console.error(`Erro ao enviar para o endpoint ${sub.endpoint}:`, err);
        // Se a assinatura for inválida ou expirada (410 Gone ou 404 Not Found), limpamos do banco de dados
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        }
        return { endpoint: sub.endpoint, success: false, error: err.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successful = results.filter(r => r.success).length;

    return jsonResponse(200, {
      success: true,
      total: results.length,
      sent: successful,
      results
    });
  } catch (error: any) {
    console.error("Erro na execução da Edge Function:", error);
    return jsonResponse(500, { error: error.message });
  }
})
