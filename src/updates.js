/** 检查已发布的静态文件；用户有工作时保留当前页面，避免中断。 */
import { state } from './state.js';

const CHECK_INTERVAL = 15 * 60 * 1000;
const FILES = [
  'index.html', 'sw.js', 'manifest.webmanifest',
  ...['main','updates','state','storage','dom-ids','errors','utils','ui','ui-demo',
    'ui-voice','ui-history','ui-settings','ui-audit-card','langs','prompts','providers',
    'export','export-formats','file-parser','markdown','translation','translation-chunked',
    'translation-helpers','translation-phases','translation-utils'].map(name => `src/${name}.js`),
  ...['tokens','base','layout','topbar','input','translate','result','engine','empty-state',
    'modals','drawer','toast','markdown','mobile','animations','hover','a11y'].map(name => `src/css/${name}.css`),
];

function hasWork() {
  const input = document.getElementById('sourceText');
  const drawer = document.getElementById('settingsDrawer');
  return state.running || !!input?.value.trim() || !!state.lastTranslation ||
    document.getElementById('resultSection')?.classList.contains('active') ||
    drawer?.classList.contains('open') || drawer?.classList.contains('active');
}

let notice;
function offerUpdate() {
  if (notice) return;
  notice = document.createElement('div');
  notice.className = 'update-notice';
  notice.setAttribute('role', 'status');
  notice.innerHTML = '<span>新版本已就绪</span><button type="button">刷新使用</button>';
  notice.querySelector('button').addEventListener('click', () => {
    if (!state.running) window.location.reload();
  });
  document.body.appendChild(notice);
  const refreshButton = () => {
    notice.querySelector('button').disabled = state.running;
    notice.querySelector('span').textContent = state.running ? '新版本已就绪，翻译结束后可更新' : '新版本已就绪';
  };
  refreshButton();
  setInterval(refreshButton, 1000);
}

let updatePending = false;
function onUpdate() {
  if (updatePending) return;
  updatePending = true;
  if (hasWork()) offerUpdate();
  else window.location.reload();
}

// 使用服务器返回的 ETag / Last-Modified；缺少校验头时计算文件内容摘要。
async function fingerprintFile(path) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 12000);
  try {
    let response = await fetch(path, { method: 'HEAD', cache: 'no-store', signal: abort.signal });
    if (!response.ok) throw new Error('version check failed');
    const tag = response.headers.get('etag') || response.headers.get('last-modified');
    if (tag) return tag;
    response = await fetch(path, { cache: 'no-store', signal: abort.signal });
    if (!response.ok) throw new Error('version check failed');
    const bytes = await response.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  } finally { clearTimeout(timer); }
}

export function startUpdates() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  let registration;
  let baseline;
  let checking = false;
  let lastCheck = 0;
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) onUpdate();
    hadController = true;
  });
  const check = async () => {
    if (checking || !navigator.onLine || document.visibilityState === 'hidden' || Date.now() - lastCheck < 60000) return;
    checking = true;
    lastCheck = Date.now();
    try {
      if (registration) await registration.update().catch(() => {});
      const current = await Promise.all(FILES.map(fingerprintFile));
      if (baseline && current.some((value, i) => value !== baseline[i])) onUpdate();
      baseline = current;
    } catch (_) { /* 离线、临时错误或部署中：保留现有版本，下次重试。 */ }
    finally { checking = false; }
  };
  window.addEventListener('load', async () => {
    try { registration = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }); }
    catch (_) { /* 无法注册时仍可直接联网使用。 */ }
    await check();
    setInterval(check, CHECK_INTERVAL);
  });
  window.addEventListener('online', check);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
}
