/**
 * 棱镜译 PrismTrans Pro V6 — 应用入口
 * ES Modules 架构入口
 */
import { state } from './state.js';
import { init, setupEventListeners } from './ui.js';
import { initVoiceInput } from './ui-voice.js';

// 启动应用
init();
initVoiceInput();
setupEventListeners();

// 暴露 state 到全局（兼容外部访问）
window.PrismTrans = { state };

// ── PWA Service Worker（仅 HTTPS/localhost 下生效，file:// 静默跳过） ──
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* 离线缓存不可用时静默降级 */ });
  });
}
