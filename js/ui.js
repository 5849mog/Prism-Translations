// ═══════════════════════════════════════════
// ui.js — DOM操作和事件绑定
// 依赖: config.js, utils.js, markdown.js, engine.js, export.js
// ═══════════════════════════════════════════

function loadFileText(text, filename) {
document.getElementById('sourceText').value = text;
updateWordStats();
updateTranslateBtnState();
sessionStorage.setItem(TEXT_CACHE_KEY, text);
document.getElementById('fileLoadedName').textContent = filename;
document.getElementById('fileLoadedBar').classList.add('visible');
detectAndApplyLang(text);
showToast(`已加载：${filename}`, 'success');
}

// ═════════════════════════════════════════
// 文件解析引擎 v3 — CDN 增强版
// PDF→pdf.js  DOCX→mammoth  XLSX→SheetJS  ZIP→JSZip
// ═════════════════════════════════════════

// ── CDN 配置（按需加载，不影响首屏）──
const CDN_LIBS = {
jszip:   'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
mammoth: 'https://cdn.jsdelivr.net/npm/mammoth@1.7.2/mammoth.browser.min.js',
xlsx:    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
pdfjs:   'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'
};
const _cdnCache = {};
function showStopBtn() {
document.getElementById('stopBtn').classList.add('visible');
const d = document.getElementById('stopBtnDesktop');
if (d) d.classList.add('visible');
}
function hideStopBtn() {
document.getElementById('stopBtn').classList.remove('visible');
const d = document.getElementById('stopBtnDesktop');
if (d) d.classList.remove('visible');
}

function doStop() {
if (!state.running) return;
if (state.abortController) state.abortController.abort();
showToast('翻译已中断');
}
document.getElementById('stopBtn').addEventListener('click', doStop);
// 桌面端停止按钮（动态绑定）
document.addEventListener('click', e => { if (e.target.closest('#stopBtnDesktop')) doStop(); });

// ─────────────────────────────────────────
// 历史记录管理
function getHistory() {
try { return JSON.parse(localStorage.getItem('prism_history') || '[]'); } catch(_) { return[]; }
}
function saveHistory(history) {
localStorage.setItem('prism_history', JSON.stringify(history.slice(0, 30)));
}
function addHistory(entry) {
const history = getHistory();
history.unshift({ ...entry, id: Date.now(), time: new Date().toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) });
saveHistory(history);
updateHistoryBadge();
}
function updateHistoryBadge() {
const h = getHistory();
const badge = document.getElementById('historyBadge');
if (h.length > 0) { badge.textContent = h.length > 9 ? '9+' : h.length; badge.classList.add('visible'); }
else { badge.classList.remove('visible'); }
}
function renderHistoryList() {
const h = getHistory();
const list = document.getElementById('historyList');
if (h.length === 0) { list.innerHTML = '<div class="history-empty">暂无翻译历史</div>'; return; }
list.innerHTML = '';
h.forEach(item => {
const el = document.createElement('div');
el.className = 'history-item';
el.innerHTML = `<div class="history-item-meta"> <div class="history-langs">${item.srcCode} → ${item.tgtCode}</div> <div class="history-time">${item.time}</div> ${item.scores ?`<div style="margin-top:4px;display:flex;gap:3px;">${['忠','流','地'].map((l,i)=>`<span style="font-size:9px;padding:1px 5px;border-radius:9999px;background:#f9ede7;color:var(--terracotta);font-family:var(--mono);">${l}${item.scores[i]}</span>`).join('')}</div>`: ''} </div> <div class="history-item-content"> <div class="history-src">${escHtml(item.src.slice(0,60))}${item.src.length>60?'...':''}</div> <div class="history-tgt">${escHtml(item.tgt.slice(0,60))}${item.tgt.length>60?'...':''}</div> ${item.remark ?`<div style="font-size:10px;color:var(--stone);margin-top:4px;line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escHtml(item.remark.slice(0,80))}${item.remark.length>80?'...':''}</div>` : ''} </div> <div class="history-actions"> <button class="history-use-btn" data-id="${item.id}">使用</button> <button class="history-del-btn" data-id="${item.id}">删除</button> </div>`;
list.appendChild(el);
});
list.querySelectorAll('.history-use-btn').forEach(btn => {
btn.addEventListener('click', e => {
const id = parseInt(e.target.dataset.id);
const item = getHistory().find(x => x.id === id);
if (!item) return;
document.getElementById('sourceText').value = item.src;
document.getElementById('charNum').textContent = item.src.length;
const srcL = LANGS.find(l => l.code === item.srcCode) || LANGS[0];
const tgtL = LANGS.find(l => l.code === item.tgtCode) || LANGS[1];
state.srcLang = srcL; state.tgtLang = tgtL;
updateLangDisplay();
closeHistoryModal();
updateWordStats();
showToast('已加载历史记录', 'success');
});
});
list.querySelectorAll('.history-del-btn').forEach(btn => {
btn.addEventListener('click', e => {
const id = parseInt(e.target.dataset.id);
let h = getHistory().filter(x => x.id !== id);
saveHistory(h);
updateHistoryBadge();
renderHistoryList();
});
});
}
function closeHistoryModal() { document.getElementById('historyModal').classList.remove('active'); }

// ─────────────────────────────────────────
// 初始化
// ─────────────────────────────────────────
function updateLangDisplay() {
document.getElementById('srcLangName').textContent = state.srcLang.name;
document.getElementById('srcLangCode').textContent = state.srcLang.label;
document.getElementById('tgtLangName').textContent = state.tgtLang.name;
document.getElementById('tgtLangCode').textContent = state.tgtLang.label;
}

// ─────────────────────────────────────────
// UI 更新（流式防幻觉）
// ─────────────────────────────────────────
const LABEL_STRIP_RE = /^[[【「]?(最优译文正文|最优译文|优化译文|最终译文|译文正文|译文|翻译结果|翻译如下|以下是译文|以下是翻译|以下译文|Translation|Final Translation|Here is the translation|隐含语义译文|隐义译文)[]】」]?[:：]?\s*/i;

function updateUI(el, full, reasoning) {
let cleanFull = full.replace(LABEL_STRIP_RE, '');
if (reasoning && !el.hasAttribute('data-has-reasoning')) {
el.innerHTML = `<div class="reasoning-text"></div><div class="content-text md-content"></div>`;
el.setAttribute('data-has-reasoning', 'true');
}
const isStreaming = el.classList.contains('streaming');
if (el.hasAttribute('data-has-reasoning')) {
el.querySelector('.reasoning-text').textContent = reasoning;
if (_markedLib) {
el.querySelector('.content-text').innerHTML = isStreaming ? renderMarkdownStream(cleanFull) : renderMarkdown(cleanFull);
} else {
el.querySelector('.content-text').textContent = cleanFull;
ensureMarked().then(() => updateUI(el, full, reasoning));
}
} else {
if (_markedLib) {
el.innerHTML = `<div class="md-content">${isStreaming ? renderMarkdownStream(cleanFull) : renderMarkdown(cleanFull)}</div>`;
} else {
el.textContent = cleanFull;
ensureMarked().then(() => updateUI(el, full, reasoning));
}
}
}

// ─────────────────────────────────────────
// 字数统计
// ─────────────────────────────────────────
function updateWordStats() {
const text = document.getElementById('sourceText').value;
const len = text.length;
document.getElementById('charNum').textContent = len;
const charEl = document.querySelector('.char-count');
charEl.classList.toggle('near-limit', len > 6000 && len <= 7500);
charEl.classList.toggle('at-limit', len > 7500);

if (len > 0) {
document.getElementById('wordStats').style.display = 'flex';
const words = text.trim().split(/\s+/).filter(Boolean).length;
const paras = text.trim().split(/\n{2,}/).filter(Boolean).length;
document.getElementById('wordCount').textContent = words;
document.getElementById('paraCount').textContent = paras;
} else {
document.getElementById('wordStats').style.display = 'none';
}
}

document.getElementById('sourceText').addEventListener('keydown', e => {
if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doTranslate(); }
});

document.getElementById('pasteBtn').addEventListener('click', async () => {
try {
const text = await navigator.clipboard.readText();
document.getElementById('sourceText').value = text;
updateWordStats();
updateTranslateBtnState();
sessionStorage.setItem(TEXT_CACHE_KEY, text);
showToast('已粘贴', 'success');
} catch(_) { showToast('无法访问剪贴板'); }
});

document.getElementById('clearBtn').addEventListener('click', () => {
document.getElementById('sourceText').value = '';
updateWordStats();
updateTranslateBtnState();
sessionStorage.removeItem(TEXT_CACHE_KEY);
document.getElementById('resultSection').classList.remove('active');
const labelEl = document.querySelector('.result-label');
labelEl.innerHTML = '最终裁决译文';
delete labelEl.dataset.earlyPreview;
document.getElementById('enginePanel').classList.remove('active');
document.getElementById('roundsContainer').innerHTML = '';
document.getElementById('auditContainer').innerHTML = '';
document.getElementById('agentGenSection').style.display = 'none';
document.getElementById('agentGenBadge').textContent = '进行中';
document.getElementById('agentGenBadge').classList.remove('done');
document.getElementById('agentGenBody').style.display = 'none';
document.getElementById('agentGenTitle').textContent = '量身定制第四位译者...';
document.getElementById('exportSection').style.display = 'none';
document.getElementById('sp0').textContent = '忠 —';
document.getElementById('sp1').textContent = '流 —';
document.getElementById('sp2').textContent = '地 —';
['sp0','sp1','sp2'].forEach(id => document.getElementById(id).classList.remove('loaded'));
stopTimer();
});

// ─────────────────────────────────────────
// 语言对调（带内容互换）
// ─────────────────────────────────────────
document.getElementById('swapBtn').addEventListener('click', () => {
const btn = document.getElementById('swapBtn');
btn.classList.add('swapping');
setTimeout(() => btn.classList.remove('swapping'), 300);

[state.srcLang, state.tgtLang] =[state.tgtLang, state.srcLang];
updateLangDisplay();

const final = document.getElementById('finalResult').textContent;
if (final) {
const src = document.getElementById('sourceText').value;
document.getElementById('sourceText').value = final;
updateWordStats();
document.getElementById('resultSection').classList.remove('active');
document.getElementById('enginePanel').classList.remove('active');
document.getElementById('roundsContainer').innerHTML = '';
document.getElementById('auditContainer').innerHTML = '';
document.getElementById('exportSection').style.display = 'none';
}
});

// ─────────────────────────────────────────
// 语言选择模态
// ─────────────────────────────────────────
function openLangModal(forSrc) {
state.pickingFor = forSrc ? 'src' : 'tgt';
document.getElementById('langModalTitle').textContent = forSrc ? '选择源语言' : '选择目标语言';
document.getElementById('langSearch').value = '';
renderLangList('');
document.getElementById('langModal').classList.add('active');
setTimeout(() => document.getElementById('langSearch').focus(), 150);
}
function closeLangModal() { document.getElementById('langModal').classList.remove('active'); }
function renderLangList(q) {
const active = state.pickingFor === 'src' ? state.srcLang : state.tgtLang;
const ql = q.toLowerCase();
const filtered = ql ? LANGS.filter(l => l.name.includes(q) || l.label.toLowerCase().includes(ql) || l.code.includes(ql)) : LANGS;
const list = document.getElementById('langList');
list.innerHTML = '';
filtered.forEach(l => {
const el = document.createElement('div');
el.className = 'lang-item' + (l.code === active.code ? ' selected' : '');
el.innerHTML = ` <div class="lang-item-left"> <div class="lang-flag">${l.flag}</div> <div><div class="lang-item-name">${l.name}</div><div class="lang-item-code">${l.label} · ${l.code}</div></div> </div> <div class="lang-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>`;
el.addEventListener('click', () => {
if (state.pickingFor === 'src') state.srcLang = l;
else state.tgtLang = l;
updateLangDisplay(); closeLangModal();
});
list.appendChild(el);
});
}
document.getElementById('srcLangBtn').addEventListener('click', () => openLangModal(true));
document.getElementById('tgtLangBtn').addEventListener('click', () => openLangModal(false));
document.getElementById('langModalBack').addEventListener('click', closeLangModal);
document.getElementById('langModal').addEventListener('click', e => { if (e.target === document.getElementById('langModal')) closeLangModal(); });
document.getElementById('langSearch').addEventListener('input', function() { renderLangList(this.value.trim()); });

// ─────────────────────────────────────────
// 设置抽屉
// ─────────────────────────────────────────
document.getElementById('settingsBtn').addEventListener('click', openDrawer);
document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);
function openDrawer() { document.getElementById('settingsDrawer').classList.add('open'); document.getElementById('drawerOverlay').classList.add('active'); }
function closeDrawer() { document.getElementById('settingsDrawer').classList.remove('open'); document.getElementById('drawerOverlay').classList.remove('active'); }
document.getElementById('roundsMinus').addEventListener('click', () => { if (state.rounds > 1) { state.rounds--; document.getElementById('roundsDisplay').textContent = state.rounds; } });
document.getElementById('roundsPlus').addEventListener('click', () => { if (state.rounds < 5) { state.rounds++; document.getElementById('roundsDisplay').textContent = state.rounds; } });
document.getElementById('keyToggle').addEventListener('click', () => { const inp = document.getElementById('apiKeyInput'); inp.type = inp.type === 'password' ? 'text' : 'password'; });
document.getElementById('saveSettingsBtn').addEventListener('click', () => {
const key = document.getElementById('apiKeyInput').value.trim();
if (!key) { showToast('请输入 API 密钥'); return; }
state.apiKey = key;
state.model = document.getElementById('modelSelect').value;
state.thinkingMode = document.getElementById('thinkingSelect').value;
state.customPrompt = document.getElementById('customPromptInput').value.trim();
state.provider = document.getElementById('providerSelect').value;
state.glossary = document.getElementById('glossaryInput').value.trim();
localStorage.setItem('prism_key', key);
localStorage.setItem('prism_rounds', state.rounds);
localStorage.setItem('prism_model', state.model);
localStorage.setItem('prism_thinking', state.thinkingMode);
localStorage.setItem('prism_custom_prompt', state.customPrompt);
localStorage.setItem('prism_provider', state.provider);
localStorage.setItem('prism_glossary', state.glossary);
// 同步模型芯片
const chip = document.getElementById('modelChip');
if (chip) chip.textContent = state.model;
// 保存后刷新按钮状态（API密钥可能刚填入）
updateTranslateBtnState();
showToast('设置已保存', 'success');
closeDrawer();
});

// ─────────────────────────────────────────
// 优化 1：Provider-模型联动过滤
// ─────────────────────────────────────────
const PROVIDER_MODELS = {
deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'],
gemini: ['gemini-2.5-flash', 'gemini-2.5-pro'],
openai: ['gpt-4.1', 'gpt-4.1-mini'],
claude: ['claude-sonnet-4-6', 'claude-haiku-4-5']
};
function updateModelOptions() {
const provider = document.getElementById('providerSelect').value;
const modelSelect = document.getElementById('modelSelect');
const allowedModels = PROVIDER_MODELS[provider] || [];
let hasVisible = false;
let firstVisible = null;
for (let i = 0; i < modelSelect.options.length; i++) {
const opt = modelSelect.options[i];
const optProvider = opt.dataset.provider;
const show = optProvider === provider;
opt.style.display = show ? '' : 'none';
opt.disabled = !show;
if (show) { hasVisible = true; if (!firstVisible) firstVisible = opt; }
}
// 如果当前选中的模型不在当前 provider 下，自动切换到该 provider 的第一个模型
const currentVal = modelSelect.value;
const currentOpt = modelSelect.querySelector(`option[value="${currentVal}"]`);
if (!currentOpt || currentOpt.dataset.provider !== provider) {
if (firstVisible) modelSelect.value = firstVisible.value;
}
// 更新 API 密钥标签
const keyLabel = document.getElementById('apiKeyLabel');
if (keyLabel) {
const names = { deepseek: 'DeepSeek', gemini: 'Gemini', openai: 'OpenAI', claude: 'Claude' };
keyLabel.textContent = names[provider] + ' API 密钥';
}
// 更新模型描述
const modelDesc = document.getElementById('modelSelectDesc');
if (modelDesc) {
const descs = {
deepseek: 'DeepSeek V4 系列 — Flash 极具性价比，Pro 性能最强',
gemini: 'Gemini 2.5 系列 — Flash 翻译冠军且免费，Pro 推理最强',
openai: 'GPT-4.1 系列 — 均衡通用，1M 超长上下文',
claude: 'Claude 系列 — Sonnet 长文本专业，Haiku 轻量快速'
};
modelDesc.textContent = descs[provider] || '';
}
// 同步 thinkingMode 可见性（仅 DeepSeek 支持）
const thinkRow = document.getElementById('thinkingSelect')?.closest('.setting-row.stacked');
if (thinkRow) thinkRow.style.display = provider === 'deepseek' ? '' : 'none';
}
document.getElementById('providerSelect').addEventListener('change', () => {
updateModelOptions();
autoSaveSettings();
});
// 初始化联动
updateModelOptions();

// ─────────────────────────────────────────
// 优化 3：设置自动保存（debounce）
// ─────────────────────────────────────────
let autoSaveTimer = null;
function autoSaveSettings() {
clearTimeout(autoSaveTimer);
autoSaveTimer = setTimeout(() => {
const key = document.getElementById('apiKeyInput').value.trim();
state.apiKey = key;
state.model = document.getElementById('modelSelect').value;
state.thinkingMode = document.getElementById('thinkingSelect').value;
state.customPrompt = document.getElementById('customPromptInput').value.trim();
state.provider = document.getElementById('providerSelect').value;
state.glossary = document.getElementById('glossaryInput').value.trim();
localStorage.setItem('prism_key', key);
localStorage.setItem('prism_rounds', state.rounds);
localStorage.setItem('prism_model', state.model);
localStorage.setItem('prism_thinking', state.thinkingMode);
localStorage.setItem('prism_custom_prompt', state.customPrompt);
localStorage.setItem('prism_provider', state.provider);
localStorage.setItem('prism_glossary', state.glossary);
// 同步模型芯片
const chip = document.getElementById('modelChip');
if (chip) chip.textContent = state.model;
// 自动保存后刷新按钮状态
updateTranslateBtnState();
}, 400);
}
// 给所有设置输入项绑定自动保存
['apiKeyInput', 'modelSelect', 'thinkingSelect', 'customPromptInput', 'glossaryInput'].forEach(id => {
const el = document.getElementById(id);
if (el) el.addEventListener('change', autoSaveSettings);
});
// API 密钥输入使用 input 事件（实时保存）
document.getElementById('apiKeyInput')?.addEventListener('input', autoSaveSettings);
// 轮次按钮点击后自动保存
document.getElementById('roundsMinus')?.addEventListener('click', () => { setTimeout(autoSaveSettings, 50); });
document.getElementById('roundsPlus')?.addEventListener('click', () => { setTimeout(autoSaveSettings, 50); });
// Escape 键关闭抽屉
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

// ─────────────────────────────────────────
// 优化 2：文本自动缓存 + 按钮状态联动
// ─────────────────────────────────────────
function updateTranslateBtnState() {
const hasText = document.getElementById('sourceText').value.trim().length > 0;
const hasKey = !!state.apiKey;
const btns = [document.getElementById('translateBtn'), document.getElementById('translateBtnDesktop')];
btns.forEach(btn => {
if (!btn) return;
if (!hasText || !hasKey) {
btn.disabled = true;
if (!hasKey) btn.title = '请先填写 API 密钥';
else if (!hasText) btn.title = '请输入待翻译文本';
} else {
btn.disabled = false;
btn.title = '';
}
});
}
// 输入时自动缓存 + 更新按钮状态
// 页面加载时恢复缓存文本
(function restoreTextCache() {
const cached = sessionStorage.getItem(TEXT_CACHE_KEY);
if (cached && cached.trim()) {
const el = document.getElementById('sourceText');
if (el && !el.value.trim()) {
el.value = cached;
updateWordStats();
updateTranslateBtnState();
}
}
})();
// API 密钥变化时更新按钮状态
document.getElementById('apiKeyInput')?.addEventListener('input', updateTranslateBtnState);
// 初始化按钮状态
updateTranslateBtnState();
// 翻译成功后清除缓存（在 doTranslate 成功后的 finally 中）

