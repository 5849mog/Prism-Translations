/**
 * 工具函数 & 简单 DOM 操作
 */
import { state, safeStore } from './state.js';
import { LANGS } from './langs.js';

// ── 生产环境开关 ──
export const PRODUCTION = true;
export const log = {
  warn() { if (!PRODUCTION) console.warn.apply(console, arguments); },
  error() { if (!PRODUCTION) console.error.apply(console, arguments); },
};

// ── 焦点陷阱 ──
let _trapContainer = null;
function _onTabKey(e) {
  if (!_trapContainer) return;
  const focusable = _trapContainer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
export function trapFocus(container) {
  releaseFocus();
  _trapContainer = container;
  document.addEventListener('keydown', _onTabKey);
  const focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length) setTimeout(() => focusable[0].focus(), 100);
}
export function releaseFocus() {
  _trapContainer = null;
  document.removeEventListener('keydown', _onTabKey);
}

// ── DOM 引用缓存 ──
let _panelRight = null;
export function getPanelRight() {
  return _panelRight || (_panelRight = document.querySelector('.panel-right'));
}

// ── 安全 HTML ──
export function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
export function safeHtml(strings, ...values) {
  return strings.reduce((result, str, i) => {
    const val = values[i] != null ? escHtml(String(values[i])) : '';
    return result + str + val;
  }, '');
}
export function purify(dirty) {
  if (typeof window.DOMPurify !== 'undefined') {
    return window.DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
  }
  return dirty;
}

// ── Toast ──
let toastTimer;
export function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ── 剪贴板 ──
export async function copyToClipboard(text) {
  if (!text) return { success: false, error: '无内容' };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return { success: true };
    }
  } catch (_) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (ok) return { success: true };
  } catch (_) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;';
    document.body.appendChild(ta);
    const range = document.createRange();
    range.selectNodeContents(ta);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const ok = document.execCommand('copy');
    sel.removeAllRanges();
    ta.remove();
    if (ok) return { success: true };
  } catch (_) { /* all failed */ }
  return { success: false, error: '剪贴板不可用' };
}

// ── Markdown 渲染 ──
export let _markedLib = null;
let _markedLoading = false;
let _markedCallbacks = [];

export function ensureDOMPurify() {
  if (typeof window.DOMPurify !== 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.2.5/dist/purify.min.js';
    s.onload = resolve;
    s.onerror = resolve;
    document.head.appendChild(s);
  });
}

export function ensureMarked() {
  return new Promise((resolve) => {
    if (_markedLib) { resolve(_markedLib); return; }
    _markedCallbacks.push(resolve);
    if (_markedLoading) return;
    _markedLoading = true;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js';
    s.onload = () => {
      _markedLib = window.marked;
      if (_markedLib) {
        try {
          _markedLib.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false, sanitize: false, smartypants: false, xhtml: false });
        } catch (_) { /* silent */ }
      }
      while (_markedCallbacks.length) _markedCallbacks.shift()(_markedLib);
    };
    s.onerror = () => {
      _markedLib = null;
      while (_markedCallbacks.length) _markedCallbacks.shift()(null);
    };
    document.head.appendChild(s);
  });
}

export function renderMarkdownStream(raw) {
  if (!_markedLib || !raw) return escHtml(raw);
  let text = raw;
  const trailing = [];
  const tail = text.slice(-200);
  if ((tail.match(/\*\*/g) || []).length % 2 === 1) { text += '**'; trailing.push('**'); }
  if ((tail.match(/`/g) || []).length % 2 === 1) { text += '`'; trailing.push('`'); }
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) { text += '](#)'; trailing.push('](#)'); }
  let html = _markedLib.parse(text);
  if (trailing.length > 0) {
    for (const t of trailing) {
      if (t === '**') html = html.replace(/<strong><\/strong>/g, '').replace(/<\/strong><strong>/g, '');
      if (t === '`') html = html.replace(/<code><\/code>/g, '').replace(/<\/code><code>/g, '');
    }
  }
  return purify(html);
}

export function renderMarkdown(raw) {
  if (!_markedLib || !raw) return escHtml(raw || '');
  try { return purify(_markedLib.parse(raw)); }
  catch (_) { return escHtml(raw); }
}

// ── UI 更新（流式防幻觉）──
export const LABEL_STRIP_RE = /^[\[【「]?(?:最优译文正文|最优译文|优化译文|最终译文|译文正文|译文|翻译结果|翻译如下|以下是译文|以下是翻译|以下译文|Translation|Final Translation|Here is the translation|隐含语义译文|隐义译文|输出译文|纯净译文|正文|输出结果|Result|Output|Translated text|翻译输出|译文输出)[]】」]?[:：]?\s*/i;

export function updateUI(el, full, reasoning) {
  let cleanFull = full.replace(LABEL_STRIP_RE, '');
  if (reasoning && !el.hasAttribute('data-has-reasoning')) {
    el.innerHTML = '<div class="reasoning-text"></div><div class="content-text md-content"></div>';
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

// ── 语言显示 ──
export function updateLangDisplay() {
  document.getElementById('srcLangName').textContent = state.srcLang.name;
  document.getElementById('srcLangCode').textContent = state.srcLang.label;
  document.getElementById('tgtLangName').textContent = state.tgtLang.name;
  document.getElementById('tgtLangCode').textContent = state.tgtLang.label;
}

// ── 字数统计 ──
export function updateWordStats() {
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

// ── 按钮状态 ──
export function updateTranslateBtnState() {
  const hasText = document.getElementById('sourceText').value.trim().length > 0;
  const hasKey = !!state.apiKey;
  const btns = [document.getElementById('translateBtn'), document.getElementById('translateBtnDesktop')];
  btns.forEach((btn) => {
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
  const dot = document.getElementById('apiStatusDot');
  const text = document.getElementById('apiStatusText');
  if (dot && text) {
    if (hasKey) {
      dot.classList.add('connected');
      text.textContent = (state.provider || '').toUpperCase() + ' · ' + state.model + (state.lastTestedProvider === state.provider ? ' ✓' : '');
    } else {
      dot.classList.remove('connected');
      text.textContent = 'API 未配置';
    }
  }
}

// ── 设置抽屉 ──
export function openDrawer() {
  document.getElementById('settingsDrawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('active');
  trapFocus(document.getElementById('settingsDrawer'));
}
export function closeDrawer() {
  document.getElementById('settingsDrawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('active');
  releaseFocus();
}

// ── 文本缓存 ──
export function clearTextCache() {
  safeStore('session', 'prism_text_cache', '');
}

// ── Stop 按钮 ──
export function showStopBtn() {
  document.getElementById('stopBtn').classList.add('visible');
  const d = document.getElementById('stopBtnDesktop');
  if (d) d.classList.add('visible');
}
export function hideStopBtn() {
  document.getElementById('stopBtn').classList.remove('visible');
  const d = document.getElementById('stopBtnDesktop');
  if (d) d.classList.remove('visible');
}

// ── 计时器 ──
export function startTimer() {
  state.startTime = Date.now();
  const el = document.getElementById('phaseTimer');
  state.timerInterval = setInterval(() => {
    const s = Math.floor((Date.now() - state.startTime) / 1000);
    el.textContent = s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60}s`;
  }, 1000);
}
export function stopTimer() {
  clearInterval(state.timerInterval);
  document.getElementById('phaseTimer').textContent = '';
}

// ── 导出工具函数 ──
export function fmtElapsed(s) {
  if (!s) return '—';
  return s < 60 ? `${s} 秒` : `${Math.floor(s / 60)} 分 ${s % 60} 秒`;
}
export function gradeLabel(s) {
  if (s >= 9) return '🟢 优秀';
  if (s >= 7) return '🟡 良好';
  if (s >= 5) return '🟠 一般';
  return '🔴 待改进';
}
export function fmtTimestamp() {
  return new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
export function getOptions() {
  return {
    incSrc: document.getElementById('optIncludeSource').checked,
    incScores: document.getElementById('optIncludeScores').checked,
    incMeta: document.getElementById('optIncludeMeta').checked,
    incProcess: document.getElementById('optIncludeProcess').checked,
    incAgent: document.getElementById('optIncludeAgent').checked,
  };
}

// ── 历史记录徽章 ──
export function updateHistoryBadge() {
  const h = JSON.parse(localStorage.getItem('prism_history') || '[]');
  const badge = document.getElementById('historyBadge');
  if (h.length > 0) {
    badge.textContent = h.length > 9 ? '9+' : h.length;
    badge.classList.add('visible');
  } else {
    badge.classList.remove('visible');
  }
}
