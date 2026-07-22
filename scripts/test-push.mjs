import fs from 'fs';
import readline from 'readline';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// 1. Carrega o .env manualmente para compatibilidade
let env = {};
try {
  const envContent = fs.readFileSync('.env', 'utf-8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      env[key] = val;
    }
  });
  console.log('✅ Arquivo .env carregado.');
} catch (e) {
  console.error('❌ Não foi possível carregar o arquivo .env.');
  process.exit(1);
}

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
const vapidPublicKey = env.VITE_WEBPUSH_PUBLIC_KEY;
const vapidPrivateKey = 'PWrzHZ9_VBBdvZhJ1nuHS9-OkgIbb-5ZpfNfbasEH-I';

if (!supabaseUrl || !supabaseAnonKey || !vapidPublicKey) {
  console.error('❌ Faltam variáveis de ambiente no .env (SUPABASE_URL, ANON_KEY ou PUBLIC_KEY).');
  process.exit(1);
}

// Configura o web-push
webpush.setVapidDetails(
  'mailto:teste@fluxo.com',
  vapidPublicKey,
  vapidPrivateKey
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n--- DISPARADOR DE TESTE DE WEB PUSH (FLUXO) ---\n');
  
  let subscription = null;
  
  // Tenta ler do Supabase
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Conectando ao Supabase para buscar assinaturas...');
    
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      console.log(`\nEncontradas ${data.length} assinaturas recentes no Supabase:`);
      data.forEach((sub, index) => {
        console.log(`[${index + 1}] User ID: ${sub.user_id} (Criada em: ${new Date(sub.created_at).toLocaleString()})`);
      });
      console.log(`[${data.length + 1}] Colar uma assinatura JSON manualmente`);
      
      const choice = await question('\nEscolha uma assinatura para enviar o teste: ');
      const choiceIdx = parseInt(choice) - 1;
      
      if (choiceIdx >= 0 && choiceIdx < data.length) {
        const selected = data[choiceIdx];
        subscription = {
          endpoint: selected.endpoint,
          keys: {
            p256dh: selected.p256dh,
            auth: selected.auth
          }
        };
        console.log('✅ Assinatura carregada do banco.');
      }
    } else {
      console.log('ℹ️ Nenhuma assinatura ativa encontrada na tabela `push_subscriptions`.');
    }
  } catch (err) {
    console.log('⚠️ Não foi possível consultar o Supabase (a tabela pode não existir ou não há conexão).');
  }

  // Solicita manual se necessário
  if (!subscription) {
    console.log('\nCole o objeto JSON de assinatura obtido no console do navegador:');
    const jsonStr = await question('JSON: ');
    try {
      subscription = JSON.parse(jsonStr.trim());
      if (!subscription.endpoint || !subscription.keys?.auth || !subscription.keys?.p256dh) {
        throw new Error('Assinatura inválida.');
      }
    } catch (e) {
      console.error('❌ JSON inválido!');
      rl.close();
      return;
    }
  }

  // Menu de tipos de notificações
  console.log('\nEscolha o tipo de notificação a enviar para teste:');
  console.log('[1] Contas a Vencer (bills_due)');
  console.log('[2] Metas Conquistadas (goals_reached)');
  console.log('[3] Limites de Orçamento (budget_limits)');
  console.log('[4] Fechamento de Faturas (card_closing)');
  console.log('[5] Lembrete de Lançamentos (daily_reminder)');
  console.log('[6] Todas as 5 em sequência');

  const typeChoice = await question('\nEscolha uma opção (1-6): ');
  
  const dailyReminders = [
    'Já lançou suas despesas hoje? Não perca tempo, depois é chato acumular tudo! 🫣',
    'Passando para lembrar: dois minutinhos agora evitam uma tarde inteira organizando comprovantes depois. Vamos de Fluxo? 😉',
    'Hora do check-in financeiro! Lançou o cafezinho ou o almoço de hoje? ☕️'
  ];
  
  const randomReminder = dailyReminders[Math.floor(Math.random() * dailyReminders.length)];

  const notifications = {
    bills_due: {
      title: 'Conta Vencendo Amanhã! 💸',
      body: 'Sua despesa "Mensalidade da Academia" no valor de R$ 119,90 vence amanhã. Não se esqueça de pagar!',
      url: '/'
    },
    goals_reached: {
      title: 'Meta Conquistada! 🏆',
      body: 'Parabéns! Você atingiu 100% do saldo alvo na sua meta "Reserva de Emergência" (R$ 5.000,00)!',
      url: '/'
    },
    budget_limits: {
      title: 'Alerta de Orçamento! ⚠️',
      body: 'Atenção: Os seus gastos mensais na categoria "Alimentação" já atingiram 82% do limite de teto estipulado.',
      url: '/'
    },
    card_closing: {
      title: 'Fatura Fechada! 💳',
      body: 'A fatura do seu cartão "Itaú Platinum" fechou hoje. O valor fechado foi R$ 1.420,50 com vencimento em 10 dias.',
      url: '/'
    },
    daily_reminder: {
      title: 'Controle seu dinheiro! 🎯',
      body: randomReminder,
      url: '/'
    }
  };

  const send = async (key, delay = 0) => {
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
    const notif = notifications[key];
    console.log(`Enviando notificação: "${notif.title}"...`);
    try {
      const response = await webpush.sendNotification(subscription, JSON.stringify(notif));
      console.log(`✅ [${key}] Enviada com sucesso! Status: ${response.statusCode}`);
    } catch (error) {
      console.error(`❌ [${key}] Erro ao enviar:`, error.message);
    }
  };

  console.log('');
  if (typeChoice === '1') {
    await send('bills_due');
  } else if (typeChoice === '2') {
    await send('goals_reached');
  } else if (typeChoice === '3') {
    await send('budget_limits');
  } else if (typeChoice === '4') {
    await send('card_closing');
  } else if (typeChoice === '5') {
    await send('daily_reminder');
  } else if (typeChoice === '6') {
    console.log('Disparando as 5 notificações com intervalo de 2 segundos...');
    await send('bills_due');
    await send('goals_reached', 2000);
    await send('budget_limits', 2000);
    await send('card_closing', 2000);
    await send('daily_reminder', 2000);
  } else {
    console.log('Opção inválida.');
  }

  rl.close();
}

main().catch(console.error);
