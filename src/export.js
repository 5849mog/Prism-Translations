/**
 * 导出功能
 */
import { state } from './state.js';
import { getProviderName } from './providers.js';
import { ID } from './dom-ids.js';
import {
  showToast, copyToClipboard, escHtml, safeHtml,
  fmtElapsed, gradeLabel, fmtTimestamp, getOptions
} from './utils.js';
import {
  renderMarkdown, renderMarkdownStream, ensureMarked, _markedLib,
} from './markdown.js';
import {
  buildMarkdown, buildPlainText, buildJson, buildBilingual,
} from './export-formats.js';

export let currentExportFmt = 'md';

function buildExportContent(fmt) {
  const t = state.lastTranslation;
  if (!t) return null;
  const opts = getOptions();
  if (fmt === 'md') return buildMarkdown(t, opts);
  if (fmt === 'txt') return buildPlainText(t, opts);
  if (fmt === 'json') return buildJson(t, opts);
  if (fmt === 'bilingual') return buildBilingual(t, opts);
  return null;
}

function triggerDownload(content, mime, ext) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const langPair = state.lastTranslation
    ? `${state.lastTranslation.srcLang}_${state.lastTranslation.tgtLang}`.replace(/\s+/g, '')
    : '';
  a.href = url;
  a.download = `prismtrans_${langPair}_${dateStr}.${ext}`;
  a.click();
  // iOS Safari 的下载在 click 后异步进行，同步 revoke 会竞态失败
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ── 导出预览 ──
let _previewAbortController = null;

function openPreviewModal(result) {
  if (_previewAbortController) _previewAbortController.abort();
  _previewAbortController = new AbortController();
  const { signal } = _previewAbortController;

  let modal = document.getElementById(ID.EXPORT_PREVIEW_MODAL);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'exportPreviewModal';
    modal.className = 'export-preview-modal';
    modal.innerHTML = `
      <div class="export-preview-panel">
        <div class="export-preview-header">
          <span class="export-preview-title">导出预览</span>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="export-preview-chars" id="previewCharCount"></span>
            <button class="history-close" id="closePreviewBtn" title="关闭">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <pre class="export-preview-body" id="exportPreviewBody"></pre>
        <div class="export-preview-footer">
          <button class="export-preview-copy-btn" id="previewCopyBtn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 复制内容
          </button>
          <button class="export-preview-dl-btn" id="previewDownloadBtn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 下载文件
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  document.getElementById(ID.CLOSE_PREVIEW_BTN).addEventListener('click', () => modal.classList.remove('active'), { signal });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); }, { signal });

  document.getElementById(ID.EXPORT_PREVIEW_BODY).textContent = result.content;
  document.getElementById(ID.PREVIEW_CHAR_COUNT).textContent = `${result.content.length.toLocaleString()} 字`;

  document.getElementById(ID.PREVIEW_COPY_BTN).addEventListener('click', async () => {
    const r = await copyToClipboard(result.content);
    showToast(r.success ? '已复制 ✓' : '复制失败，请手动复制', r.success ? 'success' : 'error');
  }, { signal });

  document.getElementById(ID.PREVIEW_DOWNLOAD_BTN).addEventListener('click', () => {
    triggerDownload(result.content, result.mime, result.ext);
    showToast('已下载 ✓', 'success');
  }, { signal });

  modal.classList.add('active');
}

// ── 导出的公共 API ──
export function setupExportListeners() {
  document.querySelectorAll('.export-fmt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.export-fmt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentExportFmt = btn.dataset.fmt;
      const labels = { md: 'Markdown 报告', txt: '纯文本报告', json: 'JSON 数据', bilingual: '双语对照文档' };
      document.getElementById(ID.EXPORT_BTN_LABEL).textContent = `下载 ${labels[currentExportFmt]}`;
    });
  });

  document.getElementById(ID.EXPORT_BTN).addEventListener('click', () => {
    const result = buildExportContent(currentExportFmt);
    if (!result) return;
    triggerDownload(result.content, result.mime, result.ext);
    showToast('报告已导出 ✓', 'success');
  });

  document.getElementById(ID.EXPORT_COPY_BTN).addEventListener('click', async () => {
    const result = buildExportContent(currentExportFmt);
    if (!result) return;
    const r = await copyToClipboard(result.content);
    showToast(r.success ? '已复制到剪贴板 ✓' : '复制失败，请手动复制', r.success ? 'success' : 'error');
  });

  // ── 系统分享（移动端调起分享面板；桌面/不支持时降级为复制） ──
  document.getElementById(ID.EXPORT_SHARE_BTN)?.addEventListener('click', async () => {
    const result = buildExportContent(currentExportFmt);
    if (!result) return;
    const t = state.lastTranslation;
    const title = t ? `棱镜译 · ${t.srcLang} → ${t.tgtLang}` : '棱镜译翻译报告';
    try {
      if (navigator.canShare && navigator.canShare({ files: [new File([result.content], `report.${result.ext}`, { type: result.mime })] })) {
        const file = new File([result.content], `prismtrans_${Date.now()}.${result.ext}`, { type: result.mime });
        await navigator.share({ files: [file], title });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title, text: result.content });
        return;
      }
    } catch (e) {
      if (e.name === 'AbortError') return; // 用户取消分享
    }
    const r = await copyToClipboard(result.content);
    showToast(r.success ? '当前环境不支持分享，已复制到剪贴板 ✓' : '复制失败，请手动复制', r.success ? 'success' : 'error');
  });

  document.getElementById(ID.EXPORT_PREVIEW_BTN).addEventListener('click', () => {
    const result = buildExportContent(currentExportFmt);
    if (!result) return;
    openPreviewModal(result);
  });
}
