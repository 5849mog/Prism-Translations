/**
 * 文件上传 & 解析引擎
 */
import { state, TEXT_CACHE_KEY, safeStore } from './state.js';
import { LANGS, LANG_DETECT_PATTERNS } from './langs.js';
import { showToast, updateWordStats, updateTranslateBtnState, updateLangDisplay } from './utils.js';

// ── CDN 多源容错配置 ──
const CDN_LIBS = {
  jszip: [
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  ],
  mammoth: [
    'https://cdn.jsdelivr.net/npm/mammoth@1.7.2/mammoth.browser.min.js',
    'https://unpkg.com/mammoth@1.7.2/mammoth.browser.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.7.2/mammoth.browser.min.js',
  ],
  xlsx: [
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  ],
  pdfjs: [
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
    'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  ],
};

/** 窗口对象名映射 */
const CDN_WIN_KEY = { jszip: 'JSZip', mammoth: 'mammoth', xlsx: 'XLSX', pdfjs: 'pdfjsLib' };

const _cdnCache = {};

/**
 * 带自动降级的 CDN 加载
 * 依次尝试每个 CDN 源，全部失败才抛异常
 */
async function loadCdn(name) {
  if (_cdnCache[name]) return;
  if (window[CDN_WIN_KEY[name]]) { _cdnCache[name] = true; return; }

  const urls = CDN_LIBS[name];
  let lastErr = null;

  for (let i = 0; i < urls.length; i++) {
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = urls[i];
        let timer = setTimeout(() => { s.remove(); reject(new Error('超时')); }, 15000);
        s.onload = () => { clearTimeout(timer); _cdnCache[name] = true; resolve(); };
        s.onerror = () => { clearTimeout(timer); s.remove(); reject(new Error('加载失败')); };
        document.head.appendChild(s);
      });
      return; // 成功
    } catch (e) {
      lastErr = e;
      if (i < urls.length - 1) {
        setFileStatus(`正在加载 ${name} 解析库 (备用源 ${i + 2}/${urls.length})...`);
      }
    }
  }
  throw new Error(`${name} 库加载失败：所有 CDN 源均不可用`);
}

// ── 解析状态提示 ──
let _fileStatusTimer = null;
function setFileStatus(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast';
  el.classList.add('show');
  clearTimeout(_fileStatusTimer);
}

function clearFileStatus() {
  clearTimeout(_fileStatusTimer);
  _fileStatusTimer = setTimeout(() => {
    const el = document.getElementById('toast');
    if (el) el.classList.remove('show');
  }, 800);
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

/** 将文件读取为 ArrayBuffer（非流式，但对 <10MB 文件足够） */
function readFileAsBuffer(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.size <= maxSize ? file : file.slice(0, maxSize));
  });
}

// ── 原生解析（无需 CDN）──
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

// ── CDN 依赖解析器 ──
async function parsePdfWithCdn(arrayBuffer) {
  await loadCdn('pdfjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = false;
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    setFileStatus(`正在解析 PDF 第 ${i}/${totalPages} 页...`);
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    pages.push(tc.items.map(it => it.str).join(' '));
  }
  clearFileStatus();
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

async function parseZipXmlWithCdn(arrayBuffer, fileFilter, label) {
  await loadCdn('jszip');
  const zip = await JSZip.loadAsync(new Uint8Array(arrayBuffer));
  let text = '';
  const targets = [];
  zip.forEach((path, obj) => { if (fileFilter(path)) targets.push(path); });
  for (const path of targets) {
    if (label) setFileStatus(`正在解析 ${label} ${targets.indexOf(path) + 1}/${targets.length}...`);
    const xml = await zip.file(path).async('string');
    const clean = xml
      .replace(/<\/[^>]+>/g, '\n')
      .replace(/<[^/][^>]*>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/'/g, "'").replace(/"/g, '"')
      .replace(/\n{3,}/g, '\n\n').trim();
    if (clean.length > 3) text += (text ? '\n\n' : '') + clean;
  }
  clearFileStatus();
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
  const isLarge = file.size > MAX;

  if (isLarge) showToast('文件超过 10MB，将只读取前 10MB', 'warning');

  try {
    const buf = ext === 'html' || ext === 'htm' || ext === 'csv'
      ? null  // 这类格式不需要 ArrayBuffer
      : await readFileAsBuffer(file, MAX);

    switch (ext) {
      case 'txt': case 'md': {
        loadFileText(decodeBytes(new Uint8Array(buf)), name);
        break;
      }
      case 'pdf': {
        setFileStatus('正在加载 PDF 解析库...');
        const text = await parsePdfWithCdn(buf);
        if (text && text.length > 10) loadFileText(text, name);
        else showToast('PDF 无文本层或为扫描版，建议复制文本后粘贴', 'error');
        break;
      }
      case 'docx': {
        setFileStatus('正在加载 DOCX 解析库...');
        const text = await parseDocxWithCdn(buf);
        if (text && text.length > 5) loadFileText(text, name);
        else showToast('docx 解析失败', 'error');
        break;
      }
      case 'xlsx': {
        setFileStatus('正在加载 XLSX 解析库...');
        const text = await parseXlsxWithCdn(buf);
        if (text && text.length > 3) loadFileText(text, name);
        else showToast('xlsx 解析失败', 'error');
        break;
      }
      case 'pptx': {
        const text = await parseZipXmlWithCdn(buf, p => /^ppt\/slides\/slide\d+\.xml$/.test(p), '幻灯片');
        if (text && text.length > 10) loadFileText('— 幻灯片分隔 —\n\n' + text, name);
        else showToast('pptx 解析失败', 'error');
        break;
      }
      case 'odt': {
        const text = await parseZipXmlWithCdn(buf, p => p === 'content.xml');
        if (text && text.length > 10) loadFileText(text, name);
        else showToast('odt 解析失败', 'error');
        break;
      }
      case 'epub': {
        const text = await parseZipXmlWithCdn(buf, p => /.(xhtml|html|xml)$/.test(p) && p.includes('chapter'), '章节');
        if (text && text.length > 20) loadFileText(text, name);
        else showToast('epub 解析失败', 'error');
        break;
      }
      case 'rtf': {
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
    clearFileStatus();
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
    // 如果检测到的语言等于当前目标语言，自动对调
    if (detected.code === state.tgtLang.code) {
      state.tgtLang = state.srcLang;
    }
    state.srcLang = detected;
    updateLangDisplay();
    chip.remove();
    showToast(`源语言已设为 ${detected.name}`, 'success');
  });
  charCountEl.appendChild(chip);
}
