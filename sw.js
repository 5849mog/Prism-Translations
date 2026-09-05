/**
 * 棱镜译 Service Worker — 最小离线方案
 *
 * 策略：
 * - 应用壳（本地文件）：cache-first，版本化 precache
 * - CDN 依赖（marked/DOMPurify/文档解析库/字体）：stale-while-revalidate
 *   弱网/离线时命中缓存，避免白屏与解析库加载失败
 */
const CACHE_NAME = 'prismtrans-v6.1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/prism.svg',
  './src/main.js',
  './src/state.js', './src/storage.js', './src/dom-ids.js', './src/errors.js',
  './src/utils.js', './src/ui.js', './src/ui-demo.js', './src/ui-voice.js',
  './src/ui-history.js', './src/ui-settings.js', './src/ui-audit-card.js',
  './src/langs.js', './src/prompts.js', './src/providers.js', './src/export.js',
  './src/export-formats.js', './src/file-parser.js', './src/markdown.js',
  './src/translation.js', './src/translation-chunked.js', './src/translation-helpers.js',
  './src/translation-phases.js', './src/translation-utils.js',
  './src/css/index.css',
  './src/css/tokens.css', './src/css/base.css', './src/css/layout.css',
  './src/css/topbar.css', './src/css/input.css', './src/css/translate.css',
  './src/css/result.css', './src/css/engine.css', './src/css/empty-state.css',
  './src/css/modals.css', './src/css/drawer.css', './src/css/toast.css',
  './src/css/markdown.css', './src/css/mobile.css', './src/css/animations.css',
  './src/css/hover.css', './src/css/a11y.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => {})) // 单个资源失败不阻断安装
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isLocal = url.origin === self.location.origin;
  const isCDN = /cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com|cdnjs\.cloudflare\.com/.test(url.hostname);
  // API 请求（各家 LLM 服务商）绝不缓存
  if (!isLocal && !isCDN) return;

  if (isLocal) {
    // 应用壳：cache-first，后台无需更新检查（版本号随发布更新）
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        return resp;
      }))
    );
  } else {
    // CDN：stale-while-revalidate
    event.respondWith(
      caches.match(req).then((hit) => {
        const network = fetch(req).then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return resp;
        }).catch(() => hit);
        return hit || network;
      })
    );
  }
});
