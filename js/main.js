// ═══════════════════════════════════════════
// main.js — 入口文件
// 依赖: 全部模块
// ═══════════════════════════════════════════

function init() {
document.getElementById('roundsDisplay').textContent = state.rounds;
if (state.apiKey) document.getElementById('apiKeyInput').value = state.apiKey;
document.getElementById('modelSelect').value = state.model;
document.getElementById('thinkingSelect').value = state.thinkingMode;
document.getElementById('providerSelect').value = state.provider;
if (state.customPrompt) document.getElementById('customPromptInput').value = state.customPrompt;
if (state.glossary) document.getElementById('glossaryInput').value = state.glossary;
updateLangDisplay();
updateHistoryBadge();
}

