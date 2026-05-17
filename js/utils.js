// utils.js — 通用工具函数

async function loadCdn(name) {
if (_cdnCache[name]) return _cdnCache[name];
if (window[name === 'jszip' ? 'JSZip' : name === 'mammoth' ? 'mammoth' : name === 'xlsx' ? 'XLSX' : 'pdfjsLib']) {
_cdnCache[name] = true; return;
}
return new Promise((resolve, reject) => {
const s = document.createElement('script');
s.src = CDN_LIBS[name];
let timer = setTimeout(() => { s.remove(); reject(new Error(name + ' 加载超时，请检查网络')); }, 30000);
s.onload = () => { clearTimeout(timer); _cdnCache[name] = true; resolve(); };
s.onerror = () => { clearTimeout(timer); reject(new Error(name + ' 加载失败')); };
document.head.appendChild(s);
});
}


// ── 编码检测（txt / md）──
function detectEncoding(bytes) {
if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return { enc: 'utf-8', skip: 3 };
if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) return { enc: 'utf-16le', skip: 2 };
if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) return { enc: 'utf-16be', skip: 2 };
// UTF-8 有效性检查
try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return { enc: 'utf-8', skip: 0 }; }
catch(_) { return { enc: 'gbk', skip: 0 }; }
}

function decodeBytes(bytes) {
const { enc, skip } = detectEncoding(bytes);
return new TextDecoder(enc, { fatal: false }).decode(bytes.slice(skip));
}


function detectLang(text) {
if (!text || text.length < 8) return null;
const sample = text.slice(0, 500);
for (const { code, pattern, threshold } of LANG_DETECT_PATTERNS) {
const matches = (sample.match(new RegExp(pattern.source, 'g')) || []).length;
if (matches / sample.length >= threshold) {
return LANGS.find(l => l.code === code) || null;
}
}
// 默认判定英文（拉丁字母为主）
const latinCount = (sample.match(/[a-zA-Z]/g) || []).length;
if (latinCount / sample.length > 0.5) return LANGS.find(l => l.code === 'en');
return null;
}


function detectAndApplyLang(text) {
const detected = detectLang(text);
if (!detected) return;
if (detected.code === state.srcLang.code) return; // 已经一致
// 显示检测提示 chip
const charCountEl = document.querySelector('.char-count');
const existingChip = document.getElementById('detectChip');
if (existingChip) existingChip.remove();
const chip = document.createElement('span');
chip.id = 'detectChip';
chip.className = 'lang-detect-chip';
chip.title = '点击应用检测语言';
chip.innerHTML = `${detected.flag} 检测到 ${detected.name}`;
chip.addEventListener('click', () => {
state.srcLang = detected;
updateLangDisplay();
chip.remove();
showToast(`源语言已设为 ${detected.name}`, 'success');
});
charCountEl.appendChild(chip);
}

function escHtml(str) {
return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// 翻译成功后清除缓存（在 doTranslate 成功后的 finally 中）
function clearTextCache() { sessionStorage.removeItem(TEXT_CACHE_KEY); }

function showToast(msg, type = '') {
const t = document.getElementById('toast');
t.textContent = msg;
t.className = 'toast' + (type ? ' ' + type : '');
t.classList.add('show');
clearTimeout(toastTimer);
toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}


// ─────────────────────────────────────────
// 统一剪贴板复制函数（三策略兜底）
// ─────────────────────────────────────────
async function copyToClipboard(text) {
if (!text) return { success: false, error: '无内容' };
// 策略1: Clipboard API（现代浏览器）
try {
if (navigator.clipboard && navigator.clipboard.writeText) {
await navigator.clipboard.writeText(text);
return { success: true };
}
} catch(e) { /* 继续策略2 */ }
// 策略2: execCommand('copy')（兼容性兜底）
try {
const ta = document.createElement('textarea');
ta.value = text;
ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';
document.body.appendChild(ta);
ta.focus(); ta.select();
const ok = document.execCommand('copy');
ta.remove();
if (ok) return { success: true };
} catch(e) { /* 继续策略3 */ }
// 策略3: 选中 + execCommand（确保焦点在文档内）
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
} catch(_) { /* 全部失败 */ }
return { success: false, error: '剪贴板不可用' };
}


// ─────────────────────────────────────────
// 计时器
// ─────────────────────────────────────────
function startTimer() {
state.startTime = Date.now();
const el = document.getElementById('phaseTimer');
state.timerInterval = setInterval(() => {
const s = Math.floor((Date.now() - state.startTime) / 1000);
el.textContent = s < 60 ? `${s}s` : `${Math.floor(s/60)}m${s%60}s`;
}, 1000);
}

function stopTimer() {
clearInterval(state.timerInterval);
document.getElementById('phaseTimer').textContent = '';
}


// ── 工具函数 ──
function fmtElapsed(s) {
if (!s) return '—';
return s < 60 ? `${s} 秒` : `${Math.floor(s/60)} 分 ${s%60} 秒`;
}

function gradeLabel(s) {
if (s >= 9) return '🟢 优秀';
if (s >= 7) return '🟡 良好';
if (s >= 5) return '🟠 一般';
return '🔴 待改进';
}

function fmtTimestamp() {
return new Date().toLocaleString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

// ═════════════════════════════════════════
// 分块翻译质量保障体系 v3
// ═════════════════════════════════════════

// ── 1. 语义边界智能切分 ──
function smartSplitIntoChunks(text, targetLen = 1200, maxLen = 1600) {
const rawParas = text.split(/\n{2,}/).filter(p => p.trim());
// 处理超长段落：按句子切分
const paras = [];
for (const para of rawParas) {
if (para.length <= maxLen) paras.push(para.trim());
else paras.push(...splitParaBySentences(para, targetLen));
}
// 合并小段为大块
const chunks = [];
let cur = '';
for (const para of paras) {
if (cur.length + para.length + 2 <= targetLen || cur.length === 0) {
cur += (cur ? '\n\n' : '') + para;
} else { chunks.push(cur.trim()); cur = para; }
}
if (cur.trim()) chunks.push(cur.trim());
return chunks;
}

function splitParaBySentences(para, targetLen) {
const breaks = [];
const regex = /[\u3002\uFF01\uFF1F\uFF1B.!?]/g;
let m;
while ((m = regex.exec(para)) !== null) {
const before = para.slice(Math.max(0, m.index - 3), m.index);
if (/\b(Dr|Mr|Mrs|Ms|Prof|Jr|Sr|vs|etc|i.e|e.g|No|vol|pp|Ch|Fig|Tab)\b/i.test(before)) continue;
breaks.push(m.index + 1);
}
const parts = [];
let start = 0;
for (const bp of breaks) {
if (bp - start >= targetLen * 0.5 && parts.length === 0) { parts.push(para.slice(start, bp).trim()); start = bp; }
else if (bp - start >= targetLen) { parts.push(para.slice(start, bp).trim()); start = bp; }
}
if (start < para.length) parts.push(para.slice(start).trim());
return parts.filter(p => p.length > 5);
}


// ── 2. 术语提取（从首块译文中提取）──
// ── 流式回溯草稿清理 ──
// DeepSeek V4 等模型在流式输出时会自我修正回溯，导致累计内容包含重复草稿痕迹
function cleanStreamingArtifacts(text) {
if (!text || text.length < 10) return text;
let cleaned = text;
// 策略1: 检测相邻短重复（3-15字符）
for (let len = 15; len >= 3; len--) {
for (let i = 0; i + len * 2 <= cleaned.length; i++) {
const a = cleaned.slice(i, i + len);
const b = cleaned.slice(i + len, i + len * 2);
if (a === b && a.trim() && !/^\s*$/.test(a)) {
cleaned = cleaned.slice(0, i + len) + cleaned.slice(i + len * 2);
i = Math.max(-1, i - len - 1);
}
}
}
// 策略2: 检测前段与后段的重复（模型回溯重写整个段落）
for (let prefixLen = 20; prefixLen <= 80 && prefixLen * 2 <= cleaned.length; prefixLen++) {
const prefix = cleaned.slice(0, prefixLen);
for (let pos = prefixLen + 5; pos + prefixLen <= cleaned.length; pos++) {
if (cleaned.slice(pos, pos + prefixLen) === prefix) {
// 找到重复前缀，检查中间内容是否像草稿
const middle = cleaned.slice(prefixLen, pos);
if (middle.length < prefixLen * 3 && middle.length > 3) {
cleaned = cleaned.slice(0, prefixLen) + cleaned.slice(pos);
return cleanStreamingArtifacts(cleaned);
}
}
}
}
return cleaned;
}


function extractKeyTerms(text) {
const terms = [];
const caps = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}\b/g);
if (caps) {
const skip = new Set(['The','And','For','But','With','From','This','That','When','Where','What','Which','There','Here','Then','Than','They','Their','Have','Been','Were','Will','Would','Could','Should','Shall','These','Those','Your','More','Most','Some','Many','Much','Such','Only','Even','Also','Well','Very','Just','Like','Over','Into','After','Before','Under','About','Through','Between','Against','Without','Within','During','Because','Although','However','Therefore','Moreover','Furthermore','Meanwhile','Otherwise','Nevertheless']);
for (const t of caps) if (!skip.has(t.split(' ')[0])) terms.push(t);
}
const bracketed = text.match(/（([^）]{2,20})）/g);
if (bracketed) for (const b of bracketed) terms.push(b.slice(1, -1));
const quoted = text.match(/["""']([^"""']{2,20})["""']/g);
if (quoted) for (const q of quoted) terms.push(q.slice(1, -1));
return [...new Set(terms)].slice(0, 15);
}

function longestCommonSubstring(a, b) {
let maxLen = 0, endIdx = 0;
const dp = Array(b.length + 1).fill(0);
for (let i = 1; i <= a.length; i++) {
let prev = 0;
for (let j = 1; j <= b.length; j++) {
const temp = dp[j];
if (a[i - 1] === b[j - 1]) { dp[j] = prev + 1; if (dp[j] > maxLen) { maxLen = dp[j]; endIdx = i; } }
else dp[j] = 0;
prev = temp;
}
}
return a.slice(endIdx - maxLen, endIdx);
}


// ── 5. 智能合并 ──
function mergeChunksSmart(chunkResults, issues) {
if (!issues || issues.length === 0) return chunkResults.join('\n\n');
const fixed = [...chunkResults];
for (const iss of issues) {
if (iss.type === '重复') {
for (let i = 1; i < fixed.length; i++) {
if (fixed[i].startsWith(iss.text) && fixed[i - 1].endsWith(iss.text)) {
fixed[i] = fixed[i].slice(iss.text.length).trim();
}
}
}
}
return fixed.join('\n\n').replace(/\n{4,}/g, '\n\n\n');
}


// ── 3. 结构化上下文记忆 ──
function buildContextMemory(i, total, chunkResults, termTable) {
const parts = [];
if (termTable.length > 0) parts.push(`【已确立术语表 — 后续翻译必须严格遵循】\n${termTable.map(t => `- ${t}`).join('\n')}`);
if (i > 0) {
const summaries = [];
for (let j = Math.max(0, i - 3); j < i; j++) {
if (chunkResults[j]) {
const s = chunkResults[j].match(/^[^\u3002\uFF01\uFF1F.!?]{10,80}[\u3002\uFF01\uFF1F.!?]?/);
if (s) summaries.push(`[块${j+1}] ${s[0]}`);
}
}
if (summaries.length) parts.push(`【前文摘要】\n${summaries.join('\n')}`);
}
if (i > 0 && chunkResults[i - 1]) parts.push(`【紧邻上文末段（确保衔接）】\n${chunkResults[i - 1].slice(-200)}`);
// 语体风格
if (i > 0 && chunkResults[0]) {
const t0 = chunkResults[0];
let style = '中性说明体';
if (/[\u6211\u4F60\u4ED6\u5979\u6211\u4EEC\u54B1\u4EEC]/.test(t0)) style = '叙事体';
else if (/[\u672C\u54C1\u672C\u516C\u53F8\u672C\u7CFB\u7EDF\u7528\u6237]/.test(t0)) style = '技术说明体';
else if (/[\u656C\u8BF7\u8C28\u6B64\u81F4\u4EE5\u987A\u795D]/.test(t0)) style = '正式信函体';
else if (/[\u6211\u8BA4\u4E3A\u4ED6\u6307\u51FA\u7814\u7A76\u8868\u660E]/.test(t0)) style = '学术论述体';
parts.push(`【语体风格】${style} — 请保持全文一致`);
}
parts.push(`【当前位置】长文第 ${i + 1}/${total} 段`);
return parts.join('\n\n');
}


// ── 4. 块间一致性审计 ──
function auditChunkConsistency(chunkResults) {
const issues = [];
for (let i = 1; i < chunkResults.length; i++) {
const prevEnd = chunkResults[i - 1].slice(-80);
const currStart = chunkResults[i].slice(0, 80);
const lcs = longestCommonSubstring(prevEnd, currStart);
if (lcs.length > 15) issues.push({ type: '重复', at: `块${i}-${i+1}边界`, text: lcs });
}
return issues;
}

