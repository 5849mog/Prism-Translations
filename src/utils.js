/**
 * 工具函数 & 简单 DOM 操作
 */
import { state } from './state.js';
import { safeStore } from './storage.js';
import { LANGS } from './langs.js';
import { ID } from './dom-ids.js';

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
/**
 * 锁定 Tab 焦点在容器内
 * @param {HTMLElement} container
 * @param {object} [opts]
 * @param {boolean} [opts.autoFocus=true] 是否自动聚焦第一个可聚焦元素
 *        （设置抽屉传 false：移动端打开即弹软键盘会盖住抽屉）
 */
export function trapFocus(container, { autoFocus = true } = {}) {
  releaseFocus();
  _trapContainer = container;
  document.addEventListener('keydown', _onTabKey);
  if (!autoFocus) return;
  const focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length) setTimeout(() => focusable[0].focus(), 100);
}
export function releaseFocus() {
  _trapContainer = null;
  document.removeEventListener('keydown', _onTabKey);
}

// ── 软键盘避让：visualViewport 写入 --kb-height，抽屉随之平移 ──
export function setupKeyboardAvoid() {
  const vv = window.visualViewport;
  if (!vv) return;
  const update = () => {
    // 键盘弹起时 vv.height 变小，与 window.innerHeight 的差值即键盘遮挡高度
    const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--kb-height', Math.round(overlap) + 'px');
  };
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  update();
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
// ── Toast ──
let toastTimer;
export function showToast(msg, type = '') {
  const t = document.getElementById(ID.TOAST);
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

// ── 语言显示 ──
export function updateLangDisplay() {
  document.getElementById(ID.SRC_LANG_NAME).textContent = state.srcLang.name;
  document.getElementById(ID.SRC_LANG_CODE).textContent = state.srcLang.label;
  document.getElementById(ID.TGT_LANG_NAME).textContent = state.tgtLang.name;
  document.getElementById(ID.TGT_LANG_CODE).textContent = state.tgtLang.label;
}

// ── 字数统计 ──
export function updateWordStats() {
  const text = document.getElementById(ID.SOURCE_TEXT).value;
  const len = text.length;
  document.getElementById(ID.CHAR_NUM).textContent = len;
  const charEl = document.querySelector('.char-count');
  charEl.classList.toggle('near-limit', len > 6000 && len <= 7500);
  charEl.classList.toggle('at-limit', len > 7500);
  if (len > 0) {
    document.getElementById(ID.WORD_STATS).style.display = 'flex';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const paras = text.trim().split(/\n{2,}/).filter(Boolean).length;
    document.getElementById(ID.WORD_COUNT).textContent = words;
    document.getElementById(ID.PARA_COUNT).textContent = paras;
  } else {
    document.getElementById(ID.WORD_STATS).style.display = 'none';
  }
}

// ── 按钮状态 ──
export function updateTranslateBtnState() {
  const hasText = document.getElementById(ID.SOURCE_TEXT).value.trim().length > 0;
  const hasKey = !!state.apiKey;
  const btns = [document.getElementById(ID.TRANSLATE_BTN), document.getElementById(ID.TRANSLATE_BTN_DESKTOP)];
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
  const dot = document.getElementById(ID.API_STATUS_DOT);
  const text = document.getElementById(ID.API_STATUS_TEXT);
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
  document.getElementById(ID.SETTINGS_DRAWER).classList.add('open');
  document.getElementById(ID.DRAWER_OVERLAY).classList.add('active');
  // 不自动聚焦：抽屉第一个可聚焦元素是 API 密钥输入框，
  // 移动端会立刻弹出软键盘盖住抽屉；用户点击输入框时再聚焦
  trapFocus(document.getElementById(ID.SETTINGS_DRAWER), { autoFocus: false });
}
export function closeDrawer() {
  const drawer = document.getElementById(ID.SETTINGS_DRAWER);
  drawer.classList.remove('open');
  drawer.style.transform = '';
  drawer.style.transition = '';
  document.getElementById(ID.DRAWER_OVERLAY).classList.remove('active');
  releaseFocus();
}

// ── 抽屉下滑手势关闭（移动端底部抽屉标配） ──
export function setupDrawerSwipe() {
  const drawer = document.getElementById(ID.SETTINGS_DRAWER);
  const handle = drawer.querySelector('.drawer-handle');
  if (!handle) return;
  let startY = 0, dy = 0, dragging = false;
  handle.addEventListener('pointerdown', (e) => {
    if (!drawer.classList.contains('open')) return;
    dragging = true;
    startY = e.clientY;
    dy = 0;
    drawer.style.transition = 'none';
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dy = Math.max(0, e.clientY - startY);
    drawer.style.transform = `translateX(-50%) translateY(${dy}px)`;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    drawer.style.transition = '';
    drawer.style.transform = '';
    if (dy > 72) closeDrawer();
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

// ── 确认对话框（替代原生 confirm，移动端观感一致） ──
export function confirmDialog(desc, { title = '确认操作', okText = '确认' } = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const ok = document.getElementById('confirmOkBtn');
    const cancel = document.getElementById('confirmCancelBtn');
    if (!modal || !ok || !cancel) { resolve(window.confirm(desc)); return; }
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmDesc').textContent = desc;
    ok.textContent = okText;
    const done = (val) => {
      modal.classList.remove('active');
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onEsc);
      resolve(val);
    };
    const onOk = () => done(true);
    const onCancel = () => done(false);
    const onBackdrop = (e) => { if (e.target === modal) done(false); };
    const onEsc = (e) => { if (e.key === 'Escape') done(false); };
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onEsc);
    modal.classList.add('active');
    setTimeout(() => ok.focus(), 80);
  });
}

// ── 文本缓存 ──
export function clearTextCache() {
  safeStore('session', 'prism_text_cache', '');
}

// ── Stop 按钮 ──
export function showStopBtn() {
  document.getElementById(ID.STOP_BTN).classList.add('visible');
  const d = document.getElementById(ID.STOP_BTN_DESKTOP);
  if (d) d.classList.add('visible');
}
export function hideStopBtn() {
  document.getElementById(ID.STOP_BTN).classList.remove('visible');
  const d = document.getElementById(ID.STOP_BTN_DESKTOP);
  if (d) d.classList.remove('visible');
}

// ── 计时器 ──
export function startTimer() {
  state.startTime = Date.now();
  const el = document.getElementById(ID.PHASE_TIMER);
  state.timerInterval = setInterval(() => {
    const s = Math.floor((Date.now() - state.startTime) / 1000);
    el.textContent = s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60}s`;
  }, 1000);
}
export function stopTimer() {
  clearInterval(state.timerInterval);
  document.getElementById(ID.PHASE_TIMER).textContent = '';
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
    incSrc: document.getElementById(ID.OPT_INCLUDE_SOURCE).checked,
    incScores: document.getElementById(ID.OPT_INCLUDE_SCORES).checked,
    incMeta: document.getElementById(ID.OPT_INCLUDE_META).checked,
    incProcess: document.getElementById(ID.OPT_INCLUDE_PROCESS).checked,
    incAgent: document.getElementById(ID.OPT_INCLUDE_AGENT).checked,
  };
}

// ── 历史记录徽章 ──
export function updateHistoryBadge() {
  const h = JSON.parse(localStorage.getItem('prism_history') || '[]');
  const badge = document.getElementById(ID.HISTORY_BADGE);
  if (h.length > 0) {
    badge.textContent = h.length > 9 ? '9+' : h.length;
    badge.classList.add('visible');
  } else {
    badge.classList.remove('visible');
  }
}
