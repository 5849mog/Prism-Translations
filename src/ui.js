/**
 * UI 管理器 — 事件绑定、初始化、模态框
 *
 * 领域模块拆分：
 *   ui-demo.js      — 示例文本库 & 演示面板
 *   ui-voice.js     — 语音输入
 *   ui-history.js   — 历史记录面板
 *   ui-settings.js  — Provider 设置 & 自动保存
 */
import { state } from './state.js';
import { safeStore, safeRemove, safeGet } from './storage.js';
import { LANGS } from './langs.js';
import {
  showToast, escHtml, safeHtml, trapFocus, releaseFocus, copyToClipboard,
  updateLangDisplay, updateWordStats, updateTranslateBtnState,
  updateHistoryBadge, openDrawer, closeDrawer, getPanelRight, log,
  setupKeyboardAvoid, setupDrawerSwipe, confirmDialog,
} from './utils.js';
import {
  updateUI,
  _markedLib, renderMarkdown, renderMarkdownStream, ensureMarked, ensureDOMPurify,
} from './markdown.js';
import {
  PROVIDER_REGISTRY, findProvider, getProviderName, getProviderDescription,
  getProviderSupportsThinking, getProviderModels, testApiConnection,
} from './providers.js';
import { doTranslate, doStop } from './translation.js';
import { handleFileSelect, loadFileText, detectLang, detectAndApplyLang } from './file-parser.js';
import { setupExportListeners, currentExportFmt } from './export.js';
import { showDemoPanel, hideDemoPanel } from './ui-demo.js';
import { stopVoiceIfListening } from './ui-voice.js';
import { renderHistoryList, closeHistoryModal } from './ui-history.js';
import {
  updateModelOptions, buildProviderCards, updateProviderConfigPanel,
  commitSettings, autoSaveSettings,
} from './ui-settings.js';
import { ID } from './dom-ids.js';

// ═════════════════════════════════════════
// 初始化
// ═════════════════════════════════════════

export function init() {
  // Set src/tgt defaults
  state.srcLang = LANGS[0];
  state.tgtLang = LANGS[1];

  document.getElementById(ID.ROUNDS_DISPLAY).textContent = state.rounds;
  if (state.apiKey) document.getElementById(ID.API_KEY_INPUT).value = state.apiKey;
  document.getElementById(ID.MODEL_SELECT).value = state.model;
  document.getElementById(ID.THINKING_SELECT).value = state.thinkingMode;
  document.getElementById(ID.PROVIDER_SELECT).value = state.provider;
  if (state.customPrompt) document.getElementById(ID.CUSTOM_PROMPT_INPUT).value = state.customPrompt;
  if (state.glossary) document.getElementById(ID.GLOSSARY_INPUT).value = state.glossary;
  updateLangDisplay();
  updateHistoryBadge();
  updateModelOptions();
  updateTranslateBtnState();
  buildProviderCards();
  updateProviderConfigPanel(state.provider);

  const chipEl = document.getElementById(ID.MODEL_CHIP);
  if (chipEl) chipEl.textContent = state.model || 'deepseek-v4-flash';
}

// ── 文本缓存恢复 ──
(function restoreTextCache() {
  const cached = safeGet('session', 'prism_text_cache', null);
  if (cached && cached.trim()) {
    const el = document.getElementById(ID.SOURCE_TEXT);
    if (el && !el.value.trim()) {
      el.value = cached;
      updateWordStats();
    }
  }
})();

// ═════════════════════════════════════════
// 语言选择模态
// ═════════════════════════════════════════

function openLangModal(forSrc) {
  state.pickingFor = forSrc ? 'src' : 'tgt';
  document.getElementById(ID.LANG_MODAL_TITLE).textContent = forSrc ? '选择源语言' : '选择目标语言';
  document.getElementById(ID.LANG_SEARCH).value = '';
  renderLangList('');
  document.getElementById(ID.LANG_MODAL).classList.add('active');
  trapFocus(document.getElementById(ID.LANG_MODAL));
  setTimeout(() => document.getElementById(ID.LANG_SEARCH).focus(), 150);
}
function closeLangModal() {
  document.getElementById(ID.LANG_MODAL).classList.remove('active');
  releaseFocus();
}
function renderLangList(q) {
  const active = state.pickingFor === 'src' ? state.srcLang : state.tgtLang;
  const ql = q.toLowerCase();
  const filtered = ql ? LANGS.filter(l => l.name.includes(q) || l.label.toLowerCase().includes(ql) || l.code.includes(ql)) : LANGS;
  const list = document.getElementById(ID.LANG_LIST);
  list.innerHTML = '';
  filtered.forEach(l => {
    const el = document.createElement('div');
    el.className = 'lang-item' + (l.code === active.code ? ' selected' : '');
    el.innerHTML = safeHtml`
      <div class="lang-item-left">
        <div class="lang-flag">${l.flag}</div>
        <div>
          <div class="lang-item-name">${l.name}</div>
          <div class="lang-item-code">${l.label} · ${l.code}</div>
        </div>
      </div>
      <div class="lang-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>
    `;
    el.addEventListener('click', () => {
      if (state.pickingFor === 'src') state.srcLang = l;
      else state.tgtLang = l;
      updateLangDisplay();
      closeLangModal();
    });
    list.appendChild(el);
  });
}

// ═════════════════════════════════════════
// 双语对照
// ═════════════════════════════════════════

let _bilingualActive = false;
function doBilingualToggle() {
  if (!state.lastTranslation?.result) {
    showToast('请完成一次翻译后使用');
    return;
  }
  const bv = document.getElementById(ID.BILINGUAL_VIEW);
  const fr = document.getElementById(ID.FINAL_RESULT);
  const bb = document.getElementById(ID.BILINGUAL_BTN);
  if (_bilingualActive) {
    bv.style.display = 'none'; fr.style.display = ''; _bilingualActive = false;
    if (bb) bb.style.color = '';
    return;
  }
  const srcLines = state.lastTranslation.source.split('\n');
  const tgtLines = state.lastTranslation.result.split('\n');
  const maxLines = Math.max(srcLines.length, tgtLines.length);
  const pairs = [];
  for (let i = 0; i < maxLines; i++) {
    const sl = srcLines[i] || '';
    const tl = tgtLines[i] || '';
    if (!sl.trim() && !tl.trim()) continue;
    pairs.push({ src: escHtml(sl), tgt: _markedLib ? renderMarkdown(tl) : escHtml(tl) });
  }
  let html = '<div class="bilingual-table-wrapper"><table class="bilingual-table"><thead><tr><th style="width:50%;">原文</th><th style="width:50%;">译文</th></tr></thead><tbody>';
  pairs.forEach(p => { html += `<tr><td>${p.src}</td><td>${p.tgt}</td></tr>`; });
  html += '</tbody></table></div>';
  bv.innerHTML = html;
  bv.style.display = 'block';
  fr.style.display = 'none';
  _bilingualActive = true;
  if (bb) bb.style.color = 'var(--terracotta)';
}

// ═════════════════════════════════════════
// 清空
// ═════════════════════════════════════════

function doClearAll() {
  document.getElementById(ID.SOURCE_TEXT).value = '';
  updateWordStats();
  updateTranslateBtnState();
  safeRemove('session', 'prism_text_cache');
  document.getElementById(ID.FINAL_RESULT).textContent = '';
  document.getElementById(ID.BILINGUAL_VIEW).style.display = 'none';
  document.getElementById(ID.FINAL_RESULT).style.display = '';
  _bilingualActive = false;
  const bilingualBtn = document.getElementById(ID.BILINGUAL_BTN);
  if (bilingualBtn) bilingualBtn.style.color = '';
  state.lastTranslation = null;
  stopVoiceIfListening();
  document.getElementById(ID.RESULT_SECTION).classList.remove('active');
  const labelEl = document.querySelector('.result-label');
  labelEl.innerHTML = '最终裁决译文';
  delete labelEl.dataset.earlyPreview;
  document.getElementById(ID.ENGINE_PANEL).classList.remove('active');
  document.getElementById(ID.ROUNDS_CONTAINER).innerHTML = '';
  document.getElementById(ID.AUDIT_CONTAINER).innerHTML = '';
  document.getElementById(ID.AGENT_GEN_SECTION).style.display = 'none';
  document.getElementById(ID.AGENT_GEN_BADGE).textContent = '进行中';
  document.getElementById(ID.AGENT_GEN_BADGE).classList.remove('done');
  document.getElementById(ID.AGENT_GEN_BODY).style.display = 'none';
  document.getElementById(ID.AGENT_GEN_TITLE).textContent = '量身定制第四位译者...';
  document.getElementById(ID.EXPORT_SECTION).style.display = 'none';
  document.getElementById(ID.SP0).textContent = '忠 —';
  document.getElementById(ID.SP1).textContent = '流 —';
  document.getElementById(ID.SP2).textContent = '地 —';
  [ID.SP0, ID.SP1, ID.SP2].forEach(id => document.getElementById(id).classList.remove('loaded'));
  clearInterval(state.timerInterval);
  document.getElementById(ID.PHASE_TIMER).textContent = '';
}

// ═════════════════════════════════════════
// 事件绑定
// ═════════════════════════════════════════

export function setupEventListeners() {
  // ── 移动端：软键盘避让 & 抽屉下滑手势 ──
  setupKeyboardAvoid();
  setupDrawerSwipe();

  // ── 深浅主题切换 ──
  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = document.getElementById('themeIcon');
  const metaTheme = document.getElementById('metaThemeColor');
  const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>';
  const MOON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  const applyTheme = (dark) => {
    if (dark) document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    if (themeIcon) themeIcon.innerHTML = `<g>${dark ? MOON : SUN}</g>`;
    if (metaTheme) metaTheme.setAttribute('content', dark ? '#211f1c' : '#f5f4ed');
    try { localStorage.setItem('prism_theme', dark ? 'dark' : 'light'); } catch (_) {}
  };
  themeBtn?.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme !== 'dark');
  });
  // 初始化按钮图标与 meta 主题色（内联脚本已设置 data-theme）
  if (themeIcon) themeIcon.innerHTML = `<g>${document.documentElement.dataset.theme === 'dark' ? MOON : SUN}</g>`;
  if (metaTheme) metaTheme.setAttribute('content', document.documentElement.dataset.theme === 'dark' ? '#211f1c' : '#f5f4ed');

  // ── 翻译按钮 ──
  document.getElementById(ID.TRANSLATE_BTN).addEventListener('click', doTranslate);
  const translateBtnDesktop = document.getElementById(ID.TRANSLATE_BTN_DESKTOP);
  if (translateBtnDesktop) translateBtnDesktop.addEventListener('click', doTranslate);

  // ── 停止按钮 ──
  document.getElementById(ID.STOP_BTN).addEventListener('click', doStop);
  document.addEventListener('click', e => { if (e.target.closest('#stopBtnDesktop')) doStop(); });

  // ── 清空 ──
  document.getElementById(ID.CLEAR_BTN).addEventListener('click', doClearAll);

  // ── 语言选择 ──
  document.getElementById(ID.SRC_LANG_BTN).addEventListener('click', () => openLangModal(true));
  document.getElementById(ID.TGT_LANG_BTN).addEventListener('click', () => openLangModal(false));
  document.getElementById(ID.LANG_MODAL_BACK).addEventListener('click', closeLangModal);
  document.getElementById(ID.LANG_MODAL).addEventListener('click', e => { if (e.target === document.getElementById(ID.LANG_MODAL)) closeLangModal(); });
  document.getElementById(ID.LANG_SEARCH).addEventListener('input', function () { renderLangList(this.value.trim()); });

  // ── 语言对调 ──
  document.getElementById(ID.SWAP_BTN).addEventListener('click', () => {
    const btn = document.getElementById(ID.SWAP_BTN);
    btn.classList.add('swapping');
    setTimeout(() => btn.classList.remove('swapping'), 300);
    [state.srcLang, state.tgtLang] = [state.tgtLang, state.srcLang];
    updateLangDisplay();
    if (state.lastTranslation?.result) {
      document.getElementById(ID.SOURCE_TEXT).value = state.lastTranslation.result;
      updateWordStats();
      updateTranslateBtnState();
      document.getElementById(ID.RESULT_SECTION).classList.remove('active');
      document.getElementById(ID.ENGINE_PANEL).classList.remove('active');
      document.getElementById(ID.ROUNDS_CONTAINER).innerHTML = '';
      document.getElementById(ID.AUDIT_CONTAINER).innerHTML = '';
      document.getElementById(ID.EXPORT_SECTION).style.display = 'none';
    }
  });

  // ── 文本输入 ──
  document.getElementById(ID.SOURCE_TEXT).addEventListener('input', function () {
    updateWordStats();
    if (this.value.length > 20) detectAndApplyLang(this.value);
    safeStore('session', 'prism_text_cache', this.value);
    updateTranslateBtnState();
  });

  document.getElementById(ID.SOURCE_TEXT).addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doTranslate(); }
  });

  // ── 粘贴 ──
  document.getElementById(ID.PASTE_BTN).addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById(ID.SOURCE_TEXT).value = text;
      updateWordStats();
      updateTranslateBtnState();
      safeStore('session', 'prism_text_cache', text);
      showToast('已粘贴', 'success');
    } catch (_) {
      // Firefox 等不支持 readText：引导用户用系统粘贴
      showToast('浏览器未授权读取剪贴板，请长按输入框选择粘贴');
      document.getElementById(ID.SOURCE_TEXT).focus();
    }
  });

  // ── 文件上传 ──
  const fileDropZone = document.getElementById(ID.FILE_DROP_ZONE);
  const fileInput = document.getElementById(ID.FILE_INPUT);
  fileDropZone.addEventListener('click', () => { fileInput.value = ''; fileInput.click(); });
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length === 1) { handleFileSelect(files[0]); return; }
  });
  fileDropZone.addEventListener('dragover', e => { e.preventDefault(); fileDropZone.classList.add('drag-over'); });
  fileDropZone.addEventListener('dragleave', () => fileDropZone.classList.remove('drag-over'));
  fileDropZone.addEventListener('drop', e => {
    e.preventDefault();
    fileDropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  });
  document.getElementById(ID.FILE_CLEAR_BTN).addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById(ID.FILE_LOADED_BAR).classList.remove('visible');
    document.getElementById(ID.FILE_INPUT).value = '';
    showToast('已移除文件');
  });

  // ── API 输入 ──
  document.getElementById(ID.API_KEY_INPUT)?.addEventListener('input', updateTranslateBtnState);

  // ── 设置 ──
  document.getElementById(ID.SETTINGS_BTN).addEventListener('click', openDrawer);
  document.getElementById(ID.DRAWER_OVERLAY).addEventListener('click', closeDrawer);
  document.getElementById(ID.ROUNDS_MINUS).addEventListener('click', () => {
    if (state.rounds > 1) { state.rounds--; document.getElementById(ID.ROUNDS_DISPLAY).textContent = state.rounds; }
  });
  document.getElementById(ID.ROUNDS_PLUS).addEventListener('click', () => {
    if (state.rounds < 5) { state.rounds++; document.getElementById(ID.ROUNDS_DISPLAY).textContent = state.rounds; }
  });
  document.getElementById(ID.KEY_TOGGLE).addEventListener('click', () => {
    const inp = document.getElementById(ID.API_KEY_INPUT);
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });
  document.getElementById(ID.SAVE_SETTINGS_BTN).addEventListener('click', () => {
    const key = document.getElementById(ID.API_KEY_INPUT).value.trim();
    if (!key) { showToast('请输入 API 密钥'); return; }
    commitSettings(key);
    showToast('设置已保存', 'success');
    closeDrawer();
  });

  // ── Provider 联动 ──
  document.getElementById(ID.PROVIDER_SELECT).addEventListener('change', function () {
    state.provider = this.value;
    updateModelOptions();
    updateProviderConfigPanel(state.provider);
    buildProviderCards();
    autoSaveSettings();
  });

  // ── 自动保存 ──
  ['apiKeyInput', 'modelSelect', 'thinkingSelect', 'customPromptInput', 'glossaryInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', autoSaveSettings);
  });
  document.getElementById(ID.API_KEY_INPUT)?.addEventListener('input', autoSaveSettings);
  document.getElementById(ID.ROUNDS_MINUS)?.addEventListener('click', () => setTimeout(autoSaveSettings, 50));
  document.getElementById(ID.ROUNDS_PLUS)?.addEventListener('click', () => setTimeout(autoSaveSettings, 50));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  // ── 自定义端点 ──
  document.getElementById(ID.CUSTOM_ENDPOINT_INPUT)?.addEventListener('input', function () {
    if (!state.customBaseUrls) state.customBaseUrls = {};
    state.customBaseUrls[state.provider] = this.value.trim() || '';
    safeStore('local', 'prism_custom_base_urls', JSON.stringify(state.customBaseUrls));
  });

  // ── 测试连接 ──
  document.getElementById(ID.TEST_API_BTN)?.addEventListener('click', async function () {
    const btn = document.getElementById(ID.TEST_API_BTN);
    const resultEl = document.getElementById(ID.TEST_API_RESULT);
    if (!state.apiKey) {
      resultEl.textContent = '❌ 请先填写 API 密钥';
      resultEl.className = 'provider-test-result error'; return;
    }
    btn.disabled = true;
    btn.classList.add('testing');
    btn.innerHTML = '<span class="spinner">◌</span> 测试中...';
    resultEl.textContent = '';
    resultEl.className = 'provider-test-result';
    const r = await testApiConnection();
    btn.disabled = false;
    btn.classList.remove('testing');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> 测试连接';
    if (r.success) {
      state.lastTestedProvider = state.provider;
      resultEl.textContent = '✓ 连接成功！';
      resultEl.className = 'provider-test-result success';
      buildProviderCards();
      updateTranslateBtnState();
      showToast('✓ ' + findProvider(state.provider).name + ' 连接成功', 'success');
    } else {
      resultEl.textContent = '❌ ' + (r.error || '连接失败');
      resultEl.className = 'provider-test-result error';
      showToast('❌ ' + (r.error || '连接失败'), 'error');
    }
  });

  // ── 历史记录 ──
  document.getElementById(ID.HISTORY_BTN).addEventListener('click', () => {
    renderHistoryList();
    document.getElementById(ID.HISTORY_MODAL).classList.add('active');
    trapFocus(document.getElementById(ID.HISTORY_MODAL));
  });
  document.getElementById(ID.HISTORY_CLOSE).addEventListener('click', closeHistoryModal);
  document.getElementById(ID.HISTORY_MODAL).addEventListener('click', e => { if (e.target === document.getElementById(ID.HISTORY_MODAL)) closeHistoryModal(); });
  document.getElementById(ID.HISTORY_CLEAR_ALL).addEventListener('click', async () => {
    const ok = await confirmDialog('将删除全部翻译历史，且无法恢复。', { title: '清空全部历史', okText: '清空' });
    if (!ok) return;
    safeRemove('local', 'prism_history');
    updateHistoryBadge();
    renderHistoryList();
  });

  // ── Demo ──
  document.getElementById(ID.DEMO_BTN)?.addEventListener('click', showDemoPanel);
  document.getElementById(ID.DEMO_PANEL_CLOSE)?.addEventListener('click', hideDemoPanel);
  document.getElementById(ID.DEMO_PANEL_MODAL)?.addEventListener('click', e => { if (e.target === document.getElementById(ID.DEMO_PANEL_MODAL)) hideDemoPanel(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById(ID.DEMO_PANEL_MODAL).classList.contains('active')) hideDemoPanel();
  });

  // ── 复制 & 朗读 ──
  let isSpeaking = false;
  document.getElementById(ID.COPY_BTN).addEventListener('click', async () => {
    const text = document.getElementById(ID.FINAL_RESULT).textContent;
    if (!text) return;
    const btn = document.getElementById(ID.COPY_BTN);
    const result = await copyToClipboard(text);
    if (result.success) {
      btn.classList.add('success');
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>已复制`;
      setTimeout(() => {
        btn.classList.remove('success');
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>复制`;
      }, 2000);
    } else {
      showToast('复制失败，请手动选中文本');
    }
  });

  document.getElementById(ID.SPEAK_BTN).addEventListener('click', () => {
    if (!window.speechSynthesis) { showToast('当前浏览器不支持朗读'); return; }
    if (isSpeaking) { speechSynthesis.cancel(); isSpeaking = false; document.getElementById(ID.SPEAK_BTN).style.color = ''; return; }
    const text = document.getElementById(ID.FINAL_RESULT).textContent;
    if (!text) { showToast('暂无译文可朗读'); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = state.tgtLang.code + '-' + state.tgtLang.code.toUpperCase();
    u.onend = () => { isSpeaking = false; document.getElementById(ID.SPEAK_BTN).style.color = ''; };
    u.onerror = () => { isSpeaking = false; document.getElementById(ID.SPEAK_BTN).style.color = ''; };
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    isSpeaking = true;
    document.getElementById(ID.SPEAK_BTN).style.color = 'var(--terracotta)';
  });

  // ── 双语对照 ──
  document.getElementById(ID.BILINGUAL_BTN)?.addEventListener('click', doBilingualToggle);

  // ── 快捷键面板 ──
  document.getElementById(ID.SHORTCUT_BTN)?.addEventListener('click', () => {
    document.getElementById(ID.SHORTCUT_PANEL)?.classList.add('active');
  });
  document.getElementById(ID.SHORTCUT_CLOSE)?.addEventListener('click', () => {
    document.getElementById(ID.SHORTCUT_PANEL)?.classList.remove('active');
  });
  document.getElementById(ID.SHORTCUT_PANEL)?.addEventListener('click', e => {
    if (e.target === document.getElementById(ID.SHORTCUT_PANEL)) document.getElementById(ID.SHORTCUT_PANEL)?.classList.remove('active');
  });

  // ── 快捷键系统 ──
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      // 有文字选中或焦点在输入框时，放行浏览器默认复制行为
      // （否则在原文里按 Ctrl+C 复制的却是译文）
      if (e.key.toLowerCase() === 'c') {
        const sel = window.getSelection();
        const active = document.activeElement;
        const inField = active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT');
        if ((sel && String(sel).length > 0) || inField) return;
      }
      switch (e.key.toLowerCase()) {
        case 'k': e.preventDefault(); openDrawer(); break;
        case 'h': e.preventDefault(); renderHistoryList(); document.getElementById(ID.HISTORY_MODAL).classList.add('active'); trapFocus(document.getElementById(ID.HISTORY_MODAL)); break;
        case 'v': e.preventDefault(); document.getElementById(ID.PASTE_BTN).click(); break;
        case 'c': e.preventDefault(); document.getElementById(ID.COPY_BTN).click(); break;
        case 's': e.preventDefault(); document.getElementById(ID.VOICE_BTN)?.click(); break;
        case 'm': e.preventDefault(); doBilingualToggle(); break;
        case 'l': e.preventDefault(); doClearAll(); break;
        case 'r': e.preventDefault(); document.getElementById(ID.SWAP_BTN).click(); break;
        case 'd': e.preventDefault(); showDemoPanel(); break;
        case 'x': e.preventDefault(); doStop(); break;
      }
    }
  });

  // ── 导出按钮 ──
  setupExportListeners();

  // ── 双击滚轮保护 ──
  const rightPanel = getPanelRight();
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  if (!isMac && rightPanel) {
    rightPanel.addEventListener('wheel', (e) => {
      const { scrollTop, scrollHeight, clientHeight } = rightPanel;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 2;
      if (e.deltaY > 0 && atBottom) e.preventDefault();
    }, { passive: false });
  }
}
