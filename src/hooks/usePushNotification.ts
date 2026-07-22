import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_WEBPUSH_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(false);

  // Verifica se o navegador suporta notificações push e service workers
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      
      // Busca assinatura existente no Service Worker
      // Usamos getRegistration para evitar travar eternamente se o Service Worker não estiver pronto
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          return registration.pushManager.getSubscription();
        }
        return null;
      }).then((sub) => {
        setSubscription(sub);
        setLoading(false);
      }).catch((err) => {
        console.error('Erro ao buscar assinatura de push:', err);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const saveSubscriptionToSupabase = useCallback(async (sub: PushSubscription) => {
    if (!user) return;

    try {
      const subJson = sub.toJSON();
      const endpoint = subJson.endpoint;
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;

      if (!endpoint || !p256dh || !auth) {
        throw new Error('Chaves da assinatura inválidas');
      }

      // Salva no Supabase (upsert)
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'endpoint'
        });

      if (error) throw error;

      console.log('Assinatura salva no Supabase com sucesso.');
    } catch (error: any) {
      console.error('Erro ao salvar assinatura no Supabase:', error);
      toast({
        title: 'Erro de Notificação',
        description: 'Não foi possível sincronizar suas notificações com o servidor.',
        variant: 'destructive'
      });
    }
  }, [user, toast]);

  const removeSubscriptionFromSupabase = useCallback(async (endpoint: string) => {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);

      if (error) throw error;
      console.log('Assinatura removida do Supabase com sucesso.');
    } catch (error) {
      console.error('Erro ao remover assinatura do Supabase:', error);
    }
  }, []);

  const subscribeUser = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: 'Navegador não suportado',
        description: 'Seu navegador não oferece suporte a notificações push.',
        variant: 'destructive'
      });
      return null;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('Chave pública VAPID (VITE_WEBPUSH_PUBLIC_KEY) não definida nas variáveis de ambiente.');
      toast({
        title: 'Configuração Incompleta',
        description: 'Chave pública de notificações não encontrada nas configurações locais.',
        variant: 'destructive'
      });
      return null;
    }

    setLoading(true);

    try {
      // Solicita permissão
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast({
          title: 'Permissão negada',
          description: 'Você precisa permitir notificações para receber alertas.',
          variant: 'destructive'
        });
        setLoading(false);
        return null;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        toast({
          title: 'Service Worker não detectado',
          description: 'O Service Worker não está ativo. Atualize a página e tente novamente.',
          variant: 'destructive'
        });
        setLoading(false);
        return null;
      }
      
      // Cria a assinatura usando a chave VAPID pública
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      setSubscription(sub);
      await saveSubscriptionToSupabase(sub);

      toast({
        title: 'Notificações ativadas!',
        description: 'Você receberá alertas do Fluxo neste dispositivo.',
      });

      setLoading(false);
      return sub;
    } catch (error: any) {
      console.error('Falha ao inscrever usuário para push:', error);
      toast({
        title: 'Erro ao ativar notificações',
        description: error.message || 'Ocorreu um erro ao registrar as notificações.',
        variant: 'destructive'
      });
      setLoading(false);
      return null;
    }
  }, [isSupported, saveSubscriptionToSupabase, toast]);

  const unsubscribeUser = useCallback(async () => {
    if (!subscription) return;

    setLoading(true);
    const endpoint = subscription.endpoint;

    try {
      // Desinscreve localmente no navegador
      const success = await subscription.unsubscribe();
      if (success) {
        setSubscription(null);
        // Remove do Supabase
        await removeSubscriptionFromSupabase(endpoint);
        toast({
          title: 'Notificações desativadas',
          description: 'Você não receberá mais alertas neste dispositivo.',
        });
      }
    } catch (error) {
      console.error('Erro ao cancelar assinatura de push:', error);
      toast({
        title: 'Erro ao desativar',
        description: 'Não foi possível cancelar as notificações no navegador.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [subscription, removeSubscriptionFromSupabase, toast]);

  // Garante que a assinatura local do navegador esteja sempre sincronizada com o Supabase
  useEffect(() => {
    if (subscription && user) {
      saveSubscriptionToSupabase(subscription);
    }
  }, [subscription, user, saveSubscriptionToSupabase]);

  return {
    isSupported,
    permission,
    subscription,
    loading,
    subscribeUser,
    unsubscribeUser
  };
}

