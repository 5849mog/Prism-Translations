// parser.js — 文件解析引擎


// ── 大文件安全读取 ──
function readFileChunked(file, maxSize) {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result);
reader.onerror = reject;
reader.readAsArrayBuffer(file.size <= maxSize ? file : file.slice(0, maxSize));
});
}


// ── HTML / CSV / RTF 原生解析 ──
function parseHtml(text) {
const doc = new DOMParser().parseFromString(text, 'text/html');
doc.querySelectorAll('script, style, nav, header, footer, aside').forEach(el => el.remove());
return (doc.body?.innerText || '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
}

function parseCsv(text) {
return text.split(/\r?\n/).map(line => {
if (!line.trim()) return '';
const cells = []; let cell = '', inQ = false;
for (let i = 0; i < line.length; i++) {
const ch = line[i];
if (ch === '"') { if (inQ && line[i+1] === '"') { cell += '"'; i++; } else { inQ = !inQ; } }
else if (ch === ',' && !inQ) { cells.push(cell.trim()); cell = ''; }
else { cell += ch; }
}
cells.push(cell.trim());
return cells.join('\t');
}).filter(Boolean).join('\n');
}

function parseRtf(bytes) {
const raw = decodeBytes(bytes);
return raw.replace(/\pard|\par|\tab|\line/g, '\n').replace(/\[a-z]+\d*\s?/gi, '')
.replace(/\\([{}])/g, '$1').replace(/\'([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
.replace(/\u(-?\d+)\s*?/g, (_, c) => String.fromCharCode(+c)).replace(/[{}]/g, '')
.replace(/\n{3,}/g, '\n\n').trim();
}


// ── 各格式 CDN 解析器 ──

// PDF → pdf.js
async function parsePdfWithCdn(arrayBuffer) {
await loadCdn('pdfjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = false; // 不使用 worker，避免额外加载
const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
const pages = [];
for (let i = 1; i <= pdf.numPages; i++) {
const page = await pdf.getPage(i);
const tc = await page.getTextContent();
pages.push(tc.items.map(it => it.str).join(' '));
}
return pages.join('\n\n');
}


// DOCX → mammoth.js
async function parseDocxWithCdn(arrayBuffer) {
await loadCdn('mammoth');
const result = await mammoth.extractRawText({ arrayBuffer });
return result.value;
}


// XLSX → SheetJS
async function parseXlsxWithCdn(arrayBuffer) {
await loadCdn('xlsx');
const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
const ws = wb.Sheets[wb.SheetNames[0]];
return XLSX.utils.sheet_to_csv(ws).replace(/,/g, '\t');
}


// PPTX / ODT / EPUB → JSZip + XML 文本提取
async function parseZipXmlWithCdn(arrayBuffer, fileFilter) {
await loadCdn('jszip');
const zip = await JSZip.loadAsync(new Uint8Array(arrayBuffer));
let text = '';
const targets = [];
zip.forEach((path, obj) => { if (fileFilter(path)) targets.push(path); });
for (const path of targets) {
const xml = await zip.file(path).async('string');
// 移除 XML 标签，提取文本
const clean = xml.replace(/<\/[^>]+>/g, '\n')   // 结束标签 → 换行
.replace(/<[^/][^>]*>/g, '')      // 开始标签 → 空
.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>')
.replace(/'/g, "'").replace(/"/g, '"')
.replace(/\n{3,}/g, '\n\n').trim();
if (clean.length > 3) text += (text ? '\n\n' : '') + clean;
}
return text;
}


// ── 主入口 ──
async function handleFileSelect(file) {
if (!file) return;
const name = file.name, ext = name.split('.').pop().toLowerCase();
const MAX = 10 * 1024 * 1024;
if (file.size > MAX) showToast('文件超过 10MB，将只读取前 10MB', 'warning');
showToast('正在加载解析库...');
try {
switch (ext) {
case 'txt': case 'md': {
const buf = await readFileChunked(file, MAX);
loadFileText(decodeBytes(new Uint8Array(buf)), name); break;
}
case 'pdf': {
const buf = await readFileChunked(file, MAX);
const text = await parsePdfWithCdn(buf);
if (text && text.length > 10) loadFileText(text, name);
else showToast('PDF 无文本层或为扫描版，建议复制文本后粘贴', 'error');
break;
}
case 'docx': {
const buf = await readFileChunked(file, MAX);
const text = await parseDocxWithCdn(buf);
if (text && text.length > 5) loadFileText(text, name);
else showToast('docx 解析失败', 'error');
break;
}
case 'xlsx': {
const buf = await readFileChunked(file, MAX);
const text = await parseXlsxWithCdn(buf);
if (text && text.length > 3) loadFileText(text, name);
else showToast('xlsx 解析失败', 'error');
break;
}
case 'pptx': {
const buf = await readFileChunked(file, MAX);
const text = await parseZipXmlWithCdn(buf,
p => /^ppt\/slides\/slide\d+\.xml$/.test(p));
if (text && text.length > 10) loadFileText('— 幻灯片分隔 —\n\n' + text, name);
else showToast('pptx 解析失败', 'error');
break;
}
case 'odt': {
const buf = await readFileChunked(file, MAX);
const text = await parseZipXmlWithCdn(buf, p => p === 'content.xml');
if (text && text.length > 10) loadFileText(text, name);
else showToast('odt 解析失败', 'error');
break;
}
case 'epub': {
const buf = await readFileChunked(file, MAX);
const text = await parseZipXmlWithCdn(buf, p => /.(xhtml|html|xml)$/.test(p) && p.includes('chapter'));
if (text && text.length > 20) loadFileText(text, name);
else showToast('epub 解析失败', 'error');
break;
}
case 'rtf': {
const buf = await readFileChunked(file, MAX);
const text = parseRtf(new Uint8Array(buf));
if (text.length > 10) loadFileText(text, name);
else showToast('rtf 解析失败', 'error');
break;
}
case 'html': case 'htm': {
const text = await file.text();
loadFileText(parseHtml(text), name); break;
}
case 'csv': {
const text = await file.text();
loadFileText(parseCsv(text), name); break;
}
default: showToast('不支持的格式：.' + ext);
}
} catch (e) { showToast('文件解析失败：' + (e.message || '未知错误'), 'error'); }
}

