import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import webpush from "npm:web-push"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Trata OPTIONS para o preflight request do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Configurações do VAPID com fallbacks reais do .env local
    const vapidPublicKey = Deno.env.get('WEBPUSH_PUBLIC_KEY') || Deno.env.get('VITE_WEBPUSH_PUBLIC_KEY') || 'BImytWeavw-TaMEIhM9phZqfuAOxQ0ncMGEd0lZJqqWiaENhCHHO0AIDv0YhkdrcyC4BkpMPlKl4Pg4B_ltoPn8';
    const vapidPrivateKey = Deno.env.get('WEBPUSH_PRIVATE_KEY') || 'PWrzHZ9_VBBdvZhJ1nuHS9-OkgIbb-5ZpfNfbasEH-I';

    webpush.setVapidDetails(
      'mailto:suporte@fluxofinanceiro.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    const { userId, broadcast, title, body: pushBody, type, url } = body;

    if (!pushBody) {
      return new Response(JSON.stringify({ error: 'O corpo da mensagem (body) é obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
      return new Response(JSON.stringify({ success: true, message: 'Nenhuma assinatura ativa encontrada para envio.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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

    return new Response(
      JSON.stringify({
        success: true,
        total: results.length,
        sent: successful,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error("Erro na execução da Edge Function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
