/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

// Toma controle dos clientes existentes imediatamente
clientsClaim();

// Ouvinte para forçar a atualização (skipWaiting) somente quando requisitado pelo prompt na UI
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Limpa caches antigos e realiza o precache dos assets do build
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);
