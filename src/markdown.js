/**
 * Markdown 渲染模块 — marked/DOMPurify CDN 懒加载 & 统一渲染入口
 *
 * 职责：所有与 Markdown 渲染相关的逻辑，包括 CDN 加载、防 XSS 净化、
 *       流式补全、标签剥离、updateUI 流式渲染。
 */
import { escHtml, safeHtml } from './utils.js';

// ── CDN 加载状态 ──
/** @type {import('marked').Marked|null} */
export let _markedLib = null;
let _markedLoading = false;
let _markedCallbacks = [];

/**
 * 确保 DOMPurify 已加载
 */
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

/**
 * 确保 marked 已加载（返回 Promise，支持多次调用排队）
 * @returns {Promise<import('marked').Marked|null>}
 */
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

/**
 * HTML 净化（XSS 防护）
 * @param {string} dirty
 * @returns {string}
 */
export function purify(dirty) {
  if (typeof window.DOMPurify !== 'undefined') {
    return window.DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
  }
  return dirty;
}

/**
 * 流式 Markdown 渲染（自动修复未闭合标记）
 * @param {string} raw
 * @returns {string}
 */
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

/**
 * 完整 Markdown 渲染
 * @param {string} raw
 * @returns {string}
 */
export function renderMarkdown(raw) {
  if (!_markedLib || !raw) return escHtml(raw || '');
  try { return purify(_markedLib.parse(raw)); }
  catch (_) { return escHtml(raw); }
}

/**
 * 标签剥离正则 — 去除 LLM 输出中的前置标签（"译文：""Final Translation:"等）
 */
export const LABEL_STRIP_RE = /^[\[【「]?(?:最优译文正文|最优译文|优化译文|最终译文|译文正文|译文|翻译结果|翻译如下|以下是译文|以下是翻译|以下译文|Translation|Final Translation|Here is the translation|隐含语义译文|隐义译文|输出译文|纯净译文|正文|输出结果|Result|Output|Translated text|翻译输出|译文输出)[]】」]?[:：]?\s*/i;

/**
 * 统一的流式 UI 更新（带推理过程 + 标签剥离 + 懒加载 marked）
 *
 * @param {HTMLElement} el      目标元素
 * @param {string}      full    完整/累积文本
 * @param {string}      [reasoning]  推理过程文本
 */
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

/**
 * 将 Markdown 内容安全渲染到指定元素（含懒加载回退）
 * 封装了「if _markedLib → innerHTML; else → textContent + ensureMarked」的重复模式
 *
 * @param {HTMLElement} el
 * @param {string}      content
 * @param {boolean}     [isStreaming=false]  是否使用流式渲染
 */
export function renderToElement(el, content, isStreaming = false) {
  const renderFn = isStreaming ? renderMarkdownStream : renderMarkdown;
  if (_markedLib) {
    el.innerHTML = `<div class="md-content">${renderFn(content)}</div>`;
  } else {
    el.textContent = content;
    ensureMarked().then(() => {
      el.innerHTML = `<div class="md-content">${renderFn(content)}</div>`;
    });
  }
}
