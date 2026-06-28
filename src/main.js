/**
 * 棱镜译 PrismTrans Pro V6 — 应用入口
 * ES Modules 架构入口
 */
import { state } from './state.js';
import { init, initVoiceInput, setupEventListeners } from './ui.js';

// 启动应用
init();
initVoiceInput();
setupEventListeners();

// 暴露 state 到全局（兼容外部访问）
window.PrismTrans = { state };
