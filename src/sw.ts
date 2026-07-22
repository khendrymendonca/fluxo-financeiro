/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

// Ativa o SW imediatamente e toma controle dos clientes existentes
self.skipWaiting();
clientsClaim();

// Limpa caches antigos e realiza o precache dos assets do build
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// Ouvinte para receber notificações Push
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push recebido.');

  let data = {
    title: 'Fluxo',
    body: 'Você tem uma nova notificação do Fluxo!',
    icon: '/fluxo-logo-v2.svg',
    badge: '/fluxo-logo-v2.svg',
    url: '/'
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      // Se não for JSON, trata como texto simples no corpo
      data.body = event.data.text();
    }
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: {
      url: data.url
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Ouvinte para clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Clique na notificação recebido.');
  
  event.notification.close();

  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se uma janela do app já está aberta, foca nela
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client) {
          // Se puder, redireciona o cliente para a url correta
          if (client.url !== urlToOpen && 'navigate' in client) {
            // @ts-ignore
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      // Se não há janelas abertas, abre uma nova
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
