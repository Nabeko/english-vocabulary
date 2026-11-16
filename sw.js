// 最小化 service worker：僅為滿足 Chrome PWA 可安裝條件而存在
// 不做離線快取（避免資料檔更新後使用者卡在舊版本），純粹pass-through
const VERSION = 'ev-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // 必須要有 fetch handler，Chrome才會判定為可安裝的PWA
  // 這裡單純透傳到網路，不做快取攔截
  event.respondWith(fetch(event.request));
});
