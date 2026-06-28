/**
 * 文件上传 & 解析引擎
 */
import { state, TEXT_CACHE_KEY, safeStore } from './state.js';
import { LANGS, LANG_DETECT_PATTERNS } from './langs.js';
import { showToast, updateWordStats, updateTranslateBtnState, updateLangDisplay } from './utils.js';

// ── CDN 配置 ──
const CDN_LIBS = {
  jszip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  mammoth: 'https://cdn.jsdelivr.net/npm/mammoth@1.7.2/mammoth.browser.min.js',
  xlsx: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  pdfjs: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
};
const _cdnCache = {};

async function loadCdn(name) {
  if (_cdnCache[name]) return;
  const winKey = { jszip: 'JSZip', mammoth: 'mammoth', xlsx: 'XLSX', pdfjs: 'pdfjsLib' }[name];
  if (window[winKey]) { _cdnCache[name] = true; return; }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CDN_LIBS[name];
    let timer = setTimeout(() => { s.remove(); reject(new Error(name + ' 加载超时')); }, 30000);
    s.onload = () => { clearTimeout(timer); _cdnCache[name] = true; resolve(); };
    s.onerror = () => { clearTimeout(timer); reject(new Error(name + ' 加载失败')); };
    document.head.appendChild(s);
  });
}

// ── 编码检测 ──
function detectEncoding(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return { enc: 'utf-8', skip: 3 };
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) return { enc: 'utf-16le', skip: 2 };
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) return { enc: 'utf-16be', skip: 2 };
  try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return { enc: 'utf-8', skip: 0 }; }
  catch (_) { return { enc: 'gbk', skip: 0 }; }
}

function decodeBytes(bytes) {
  const { enc, skip } = detectEncoding(bytes);
  return new TextDecoder(enc, { fatal: false }).decode(bytes.slice(skip));
}

function readFileChunked(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.size <= maxSize ? file : file.slice(0, maxSize));
  });
}

// ── 原生解析 ──
function parseHtml(text) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  doc.querySelectorAll('script, style, nav, header, footer, aside').forEach(el => el.remove());
  return (doc.body?.innerText || '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
}

function parseCsv(text) {
  return text.split(/\r?\n/).map(line => {
    if (!line.trim()) return '';
    const cells = [];
    let cell = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cell += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) { cells.push(cell.trim()); cell = ''; }
      else cell += ch;
    }
    cells.push(cell.trim());
    return cells.join('\t');
  }).filter(Boolean).join('\n');
}

function parseRtf(bytes) {
  const raw = decodeBytes(bytes);
  return raw
    .replace(/\\pard|\\par|\\tab|\\line/g, '\n')
    .replace(/\\[a-z]+\d*\s?/gi, '')
    .replace(/\\([{}])/g, '$1')
    .replace(/'([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u(-?\d+)\s*?/g, (_, c) => String.fromCharCode(+c))
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── CDN 解析器 ──
async function parsePdfWithCdn(arrayBuffer) {
  await loadCdn('pdfjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = false;
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    pages.push(tc.items.map(it => it.str).join(' '));
  }
  return pages.join('\n\n');
}

async function parseDocxWithCdn(arrayBuffer) {
  await loadCdn('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function parseXlsxWithCdn(arrayBuffer) {
  await loadCdn('xlsx');
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_csv(ws).replace(/,/g, '\t');
}

async function parseZipXmlWithCdn(arrayBuffer, fileFilter) {
  await loadCdn('jszip');
  const zip = await JSZip.loadAsync(new Uint8Array(arrayBuffer));
  let text = '';
  const targets = [];
  zip.forEach((path, obj) => { if (fileFilter(path)) targets.push(path); });
  for (const path of targets) {
    const xml = await zip.file(path).async('string');
    const clean = xml
      .replace(/<\/[^>]+>/g, '\n')
      .replace(/<[^/][^>]*>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/'/g, "'").replace(/"/g, '"')
      .replace(/\n{3,}/g, '\n\n').trim();
    if (clean.length > 3) text += (text ? '\n\n' : '') + clean;
  }
  return text;
}

// ── 文件加载 ──
export function loadFileText(text, filename) {
  document.getElementById('sourceText').value = text;
  updateWordStats();
  updateTranslateBtnState();
  safeStore('session', TEXT_CACHE_KEY, text);
  document.getElementById('fileLoadedName').textContent = filename;
  document.getElementById('fileLoadedBar').classList.add('visible');
  detectAndApplyLang(text);
  showToast(`已加载：${filename}`, 'success');
}

// ── 主入口 ──
export async function handleFileSelect(file) {
  if (!file) return;
  const name = file.name, ext = name.split('.').pop().toLowerCase();
  const MAX = 10 * 1024 * 1024;
  if (file.size > MAX) showToast('文件超过 10MB，将只读取前 10MB', 'warning');
  showToast('正在加载解析库...');
  try {
    switch (ext) {
      case 'txt': case 'md': {
        const buf = await readFileChunked(file, MAX);
        loadFileText(decodeBytes(new Uint8Array(buf)), name);
        break;
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
        const text = await parseZipXmlWithCdn(buf, p => /^ppt\/slides\/slide\d+\.xml$/.test(p));
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
        loadFileText(parseHtml(text), name);
        break;
      }
      case 'csv': {
        const text = await file.text();
        loadFileText(parseCsv(text), name);
        break;
      }
      default:
        showToast('不支持的格式：.' + ext);
    }
  } catch (e) {
    showToast('文件解析失败：' + (e.message || '未知错误'), 'error');
  }
}

// ── 语言检测 ──
export function detectLang(text) {
  if (!text || text.length < 8) return null;
  const sample = text.slice(0, 500);
  for (const { code, pattern, threshold } of LANG_DETECT_PATTERNS) {
    const matches = (sample.match(new RegExp(pattern.source, 'g')) || []).length;
    if (matches / sample.length >= threshold) {
      return LANGS.find(l => l.code === code) || null;
    }
  }
  const latinCount = (sample.match(/[a-zA-Z]/g) || []).length;
  if (latinCount / sample.length > 0.5) return LANGS.find(l => l.code === 'en');
  return null;
}

export function detectAndApplyLang(text) {
  const detected = detectLang(text);
  if (!detected) return;
  if (detected.code === state.srcLang.code) return;
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
