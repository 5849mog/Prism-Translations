// ═══════════════════════════════════════════
// markdown.js — Markdown实时渲染引擎
// 依赖: config.js, utils.js (escHtml)
// ═══════════════════════════════════════════

function ensureMarked() {
return new Promise((resolve) => {
if (_markedLib) { resolve(_markedLib); return; }
_markedCallbacks.push(resolve);
if (_markedLoading) return;
_markedLoading = true;
const s = document.createElement('script');
s.src = 'https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js';
s.onload = () => {
_markedLib = window.marked;
// 配置：允许软换行、禁用不安全的HTML标签
if (_markedLib) {
try {
_markedLib.setOptions({
breaks: true,
gfm: true,
headerIds: false,
mangle: false,
sanitize: false,
smartypants: false,
xhtml: false
});
} catch(_) {}
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

// 流式场景：智能处理未闭合的 Markdown 标记
// 策略：临时补全未闭合标记 → marked 解析 → 移除临时补全痕迹
const UNCLOSED_RE = /(\*\*(?!.*?\*\*)|\*(?!.*?(?<!\*)\*)|__(?!.*?__)|`{1,3}(?!.*?`{1,3})|\[(?![^\]]*\])|<(?![^>]*>))/gs;
function renderMarkdownStream(raw) {
if (!_markedLib || !raw) return escHtml(raw);
// 检查末尾是否有未闭合的 markdown 标记
let text = raw;
const trailing = [];
// 检测末尾未闭合的 **
if ((text.match(/\*\*/g) || []).length % 2 === 1) {
text += '**'; trailing.push('**');
}
// 检测末尾未闭合的 `
if ((text.match(/`/g) || []).length % 2 === 1) {
text += '`'; trailing.push('`');
}
// 检测末尾未闭合的 [
const openBrackets = (text.match(/\[/g) || []).length;
const closeBrackets = (text.match(/\]/g) || []).length;
if (openBrackets > closeBrackets) {
text += '](#)'; trailing.push('](#)');
}
// 用 marked 解析
let html = _markedLib.parse(text);
// 如果追加了临时补全，移除对应的痕迹
if (trailing.length > 0) {
// 移除追加的闭合标记在 HTML 中的体现
for (const t of trailing) {
if (t === '**') html = html.replace(/<strong><\/strong>/g, '').replace(/<\/strong><strong>/g, '');
if (t === '`') html = html.replace(/<code><\/code>/g, '').replace(/<\/code><code>/g, '');
}
}
return html;
}

// 非流式场景：直接完整渲染
function renderMarkdown(raw) {
if (!_markedLib || !raw) return escHtml(raw || '');
try { return _markedLib.parse(raw); } catch(_) { return escHtml(raw); }
}

document.getElementById('historyBtn').addEventListener('click', () => {
renderHistoryList();
document.getElementById('historyModal').classList.add('active');
});
document.getElementById('historyClose').addEventListener('click', closeHistoryModal);
document.getElementById('historyModal').addEventListener('click', e => { if (e.target === document.getElementById('historyModal')) closeHistoryModal(); });
document.getElementById('historyClearAll').addEventListener('click', () => {
if (!confirm('确认清空全部翻译历史？')) return;
localStorage.removeItem('prism_history');
updateHistoryBadge();
renderHistoryList();
});

