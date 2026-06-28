/**
 * 导出功能
 */
import { state } from './state.js';
import { getProviderName } from './providers.js';
import {
  showToast, copyToClipboard, escHtml, safeHtml,
  renderMarkdown, renderMarkdownStream, ensureMarked, _markedLib,
  fmtElapsed, gradeLabel, fmtTimestamp, getOptions
} from './utils.js';

export let currentExportFmt = 'md';

// ── 构建各类导出 ──
function buildMarkdown(t, opts) {
  const ts = fmtTimestamp();
  const elapsed = fmtElapsed(t.elapsed);
  const avg = t.scores ? (t.scores.reduce((a, b) => a + b, 0) / t.scores.length).toFixed(1) : null;
  const dims = ['忠实度', '流畅度', '地道度'];
  const modeNames = { refined: '✦ 精炼', standard: '◈ 标准', efficient: '◇ 效率', light: '○ 轻量', chunk: '⬡ 分块' };

  let md = `# 棱镜译 · 翻译报告\n\n`;
  if (opts.incMeta) {
    md += `## 📋 基本信息\n\n`;
    md += `| 项目 | 内容 |\n|------|------|\n`;
    md += `| 导出时间 | ${ts} |\n`;
    md += `| 语言对 | ${t.srcLang} → ${t.tgtLang} |\n`;
    md += `| 翻译服务商 | ${t.providerName || (t.provider ? getProviderName(t.provider) : '—')} |\n`;
    md += `| 翻译模型 | \`${t.model}\` |\n`;
    md += `| 翻译模式 | ${modeNames[t.mode] || t.mode || '—'} |\n`;
    md += `| 迭代轮次 | ${t.rounds || 1} 轮 |\n`;
    if (t.dynamicAgent?.name) md += `| 专属译者 丁 | ${t.dynamicAgent.name}（${t.dynamicAgent.label}）|\n`;
    if (t.thinkingMode && t.thinkingMode !== 'disabled') md += `| 深度思考 | ${t.thinkingMode === 'high' ? '已启用（预算 2K）' : '已启用（预算 4K）'} |\n`;
    md += `| 耗时 | ${elapsed} |\n`;
    md += `| 原文字数 | ${t.charCount || t.source?.length || '—'} 字 |\n`;
    if (t.customPrompt) md += `| 自定义指令 | \`${t.customPrompt.slice(0, 80)}${t.customPrompt.length > 80 ? '...' : ''}\` |\n`;
    md += `| API Token 消耗 | ${t.usageTokens?.total ? `${t.usageTokens.total.toLocaleString()}（输入 ${t.usageTokens.prompt?.toLocaleString() || '?'} / 输出 ${t.usageTokens.completion?.toLocaleString() || '?'}）` : '统计中...'} |\n\n`;
  }
  if (opts.incSrc) {
    md += `---\n\n## 📄 原文\n\n> **字数：** ${t.source?.length || 0}\n\n\`\`\`\n${t.source}\n\`\`\`\n\n`;
  }
  md += `---\n\n## ✅ 最终裁决译文\n\n${t.result}\n\n`;
  if (opts.incScores && t.scores) {
    md += `---\n\n## 🏆 质量评审\n\n| 维度 | 分数 | 评级 | 进度 |\n|------|------|------|------|\n`;
    t.scores.forEach((s, i) => {
      const bar = '█'.repeat(Math.round(s)) + '░'.repeat(10 - Math.round(s));
      md += `| ${dims[i]} | **${s}/10** | ${gradeLabel(s)} | \`${bar}\` |\n`;
    });
    md += `| **综合均分** | **${avg}/10** | ${gradeLabel(parseFloat(avg))} | — |\n`;
    if (t.remark) md += `\n### 📝 评审意见\n\n> ${t.remark.replace(/\n/g, '\n> ')}\n\n`;
  }
  if (opts.incProcess && t.roundData?.length) {
    md += `---\n\n## 🔬 完整翻译过程\n\n`;
    if (opts.incAgent && t.dynamicAgent?.name) md += `### 🤖 专属译者（Path D）\n\n**名称：** ${t.dynamicAgent.name}　**能力标签：** ${t.dynamicAgent.label}\n\n`;
    t.roundData.forEach(rd => {
      md += `### 第 ${rd.round} 轮\n\n`;
      md += `> **Token 消耗：** ${rd.usageTokens?.total ? `输入 ${rd.usageTokens.prompt?.toLocaleString() || '?'} / 输出 ${rd.usageTokens.completion?.toLocaleString() || '?'} / 总计 ${rd.usageTokens.total.toLocaleString()}` : '统计中...'}\n\n`;
      md += `#### 阶一：五路并发草稿\n\n`;
      const pathMeta = [
        ['甲 · 语言学家', rd.paths.A, '忠实'],
        ['乙 · 本土编辑', rd.paths.B, '地道'],
        ['丙 · 领域专家', rd.paths.C, '专业'],
        [`D · ${t.dynamicAgent?.name || '专属译者'}`, rd.paths.D, '动态'],
        ['戊 · 隐义探微', rd.paths.E, '隐义'],
      ];
      pathMeta.forEach(([name, text, tag]) => {
        if (!text) return;
        md += `<details>\n<summary><strong>${name}</strong>（${tag}路）</summary>\n\n${text}\n\n</details>\n\n`;
      });
      if (rd.critiques.A || rd.critiques.B || rd.critiques.C || rd.critiques.D || rd.critiques.F) {
        md += `#### 阶二：交叉批判网络\n\n`;
        const critMeta = [
          ['甲 审 乙/丙', rd.critiques.A],
          ['乙 审 丙/丁', rd.critiques.B],
          ['C 批判 D/A', rd.critiques.C],
          ['丁 审 甲/乙', rd.critiques.D],
          ['己 审 甲/丙', rd.critiques.F],
        ];
        critMeta.forEach(([name, text]) => {
          if (!text) return;
          md += `<details>\n<summary>${name}</summary>\n\n${text}\n\n</details>\n\n`;
        });
      }
      if (rd.synthesis) md += `#### 阶三：综合裁决\n\n${rd.synthesis}\n\n`;
      if (rd.memo) md += `#### 迭代备忘录\n\n> ${rd.memo.replace(/\n/g, '\n> ')}\n\n`;
    });
  }
  if (opts.incMeta) md += `---\n\n*由 **棱镜译 PrismTrans Pro V6** 生成 · ${ts}*\n`;
  return { content: md, mime: 'text/markdown;charset=utf-8', ext: 'md' };
}

function buildPlainText(t, opts) {
  const sep1 = '═'.repeat(60);
  const sep2 = '─'.repeat(60);
  const ts = fmtTimestamp();
  const dims = ['忠实度', '流畅度', '地道度'];
  const avg = t.scores ? (t.scores.reduce((a, b) => a + b, 0) / t.scores.length).toFixed(1) : null;

  let txt = `${sep1}\n棱镜译 PrismTrans Pro V6 · 翻译报告\n${sep1}\n\n`;
  if (opts.incMeta) {
    txt += `导出时间：${ts}\n语言对：${t.srcLang} → ${t.tgtLang}\n`;
    txt += `服务商：${t.providerName || (t.provider ? getProviderName(t.provider) : '—')}\n模型：${t.model}\n`;
    txt += `翻译模式：${t.modeLabel || t.mode || '—'}\n迭代轮次：${t.rounds || 1} 轮\n`;
    if (t.dynamicAgent?.name) txt += `专属译者：${t.dynamicAgent.name}（${t.dynamicAgent.label}）\n`;
    txt += `耗时：${fmtElapsed(t.elapsed)}\n原文长度：${t.charCount || t.source?.length || '—'} 字\n`;
    txt += `API Token 消耗：${t.usageTokens?.total ? `${t.usageTokens.total.toLocaleString()}（输入 ${t.usageTokens.prompt?.toLocaleString() || '?'} / 输出 ${t.usageTokens.completion?.toLocaleString() || '?'}）` : '统计中...'}\n`;
    if (t.customPrompt) txt += `自定义指令：${t.customPrompt.slice(0, 100)}\n`;
    txt += `\n`;
  }
  if (opts.incSrc) txt += `${sep2}\n【原　文】\n${sep2}\n${t.source}\n\n`;
  txt += `${sep2}\n【最终裁决译文】\n${sep2}\n${t.result}\n\n`;
  if (opts.incScores && t.scores) {
    txt += `${sep2}\n【质量评审】\n${sep2}\n`;
    t.scores.forEach((s, i) => {
      const bar = '■'.repeat(s) + '□'.repeat(10 - s);
      txt += `${dims[i]}：${s}/10  ${bar}  ${gradeLabel(s)}\n`;
    });
    txt += `综合均分：${avg}/10  ${gradeLabel(parseFloat(avg))}\n`;
    if (t.remark) txt += `\n评审意见：\n${t.remark}\n`;
    txt += `\n`;
  }
  if (opts.incProcess && t.roundData?.length) {
    t.roundData.forEach(rd => {
      txt += `${sep1}\n第 ${rd.round} 轮翻译过程\n${sep1}\n`;
      if (rd.usageTokens?.total) txt += `Token：输入 ${rd.usageTokens.prompt?.toLocaleString() || '?'} / 输出 ${rd.usageTokens.completion?.toLocaleString() || '?'} / 总计 ${rd.usageTokens.total.toLocaleString()}\n`;
      txt += `\n`;
      const paths = [
        ['甲 · 语言学家', rd.paths.A], ['乙 · 本土编辑', rd.paths.B],
        ['丙 · 领域专家', rd.paths.C], [`D · ${t.dynamicAgent?.name || '动态'}`, rd.paths.D],
        ['戊 · 隐义探微', rd.paths.E],
      ];
      paths.forEach(([name, text]) => { if (text) txt += `【${name}】\n${text}\n\n`; });
      if (rd.critiques.A) txt += `【交叉批判 A→B/C】\n${rd.critiques.A}\n\n`;
      if (rd.critiques.B) txt += `【交叉批判 B→C/D】\n${rd.critiques.B}\n\n`;
      if (rd.critiques.C) txt += `【交叉批判 C→D/A】\n${rd.critiques.C}\n\n`;
      if (rd.critiques.D) txt += `【交叉批判 D→A/B】\n${rd.critiques.D}\n\n`;
      if (rd.critiques.F) txt += `【交叉批判 F→A/C】\n${rd.critiques.F}\n\n`;
      if (rd.synthesis) txt += `【综合裁决】\n${rd.synthesis}\n\n`;
      if (rd.memo) txt += `【迭代备忘录】\n${rd.memo}\n\n`;
    });
  }
  return { content: txt, mime: 'text/plain;charset=utf-8', ext: 'txt' };
}

function buildJson(t, opts) {
  const ts = fmtTimestamp();
  const avg = t.scores ? parseFloat((t.scores.reduce((a, b) => a + b, 0) / t.scores.length).toFixed(1)) : null;
  const obj = { app: '棱镜译 PrismTrans Pro V6', exportedAt: ts };
  if (opts.incMeta) {
    Object.assign(obj, {
      srcLang: t.srcLang, tgtLang: t.tgtLang,
      provider: t.provider, providerName: t.providerName || getProviderName(t.provider), model: t.model,
      mode: t.mode, modeLabel: t.modeLabel, rounds: t.rounds,
      elapsed: t.elapsed, elapsedFormatted: fmtElapsed(t.elapsed),
      thinkingMode: t.thinkingMode, charCount: t.charCount, wordCount: t.wordCount,
      dynamicAgent: t.dynamicAgent, customPrompt: t.customPrompt || null,
    });
  }
  if (opts.incSrc) obj.source = t.source;
  obj.result = t.result;
  if (opts.incScores && t.scores) {
    obj.quality = {
      fidelity: t.scores[0], fluency: t.scores[1], naturalness: t.scores[2],
      average: avg, remark: t.remark || '',
      grades: { fidelity: gradeLabel(t.scores[0]), fluency: gradeLabel(t.scores[1]), naturalness: gradeLabel(t.scores[2]) },
    };
  }
  if (opts.incProcess && t.roundData?.length) {
    obj.roundData = t.roundData.map(rd => ({
      round: rd.round,
      paths: opts.incProcess ? rd.paths : undefined,
      critiques: opts.incProcess ? rd.critiques : undefined,
      synthesis: rd.synthesis, memo: rd.memo || null,
    }));
  }
  return { content: JSON.stringify(obj, null, 2), mime: 'application/json;charset=utf-8', ext: 'json' };
}

function buildBilingual(t, opts) {
  const ts = fmtTimestamp();
  const avg = t.scores ? (t.scores.reduce((a, b) => a + b, 0) / t.scores.length).toFixed(1) : null;
  let md = `# 棱镜译 · 双语对照\n\n`;
  if (opts.incMeta) md += `> **语言对：** ${t.srcLang} → ${t.tgtLang}　**模型：** \`${t.model}\`　**导出：** ${ts}\n\n`;
  md += `—\n\n`;
  const srcParas = t.source.split(/\n\n+/);
  const tgtParas = t.result.split(/\n\n+/);
  const pMax = Math.max(srcParas.length, tgtParas.length);
  for (let i = 0; i < pMax; i++) {
    if (opts.incSrc && srcParas[i]) md += `**【原文】**\n\n${srcParas[i]}\n\n`;
    if (tgtParas[i]) md += `**【译文】**\n\n${tgtParas[i]}\n\n`;
    if (i < pMax - 1) md += `—\n\n`;
  }
  if (opts.incScores && t.scores) {
    md += `\n—\n\n## 质量评分\n\n`;
    md += `忠实度 **${t.scores[0]}/10** ${gradeLabel(t.scores[0])} · 流畅度 **${t.scores[1]}/10** ${gradeLabel(t.scores[1])} · 地道度 **${t.scores[2]}/10** ${gradeLabel(t.scores[2])} · 均分 **${avg}/10**\n`;
    if (t.remark) md += `\n> ${t.remark}\n`;
  }
  if (opts.incMeta) md += `\n—\n\n*棱镜译 PrismTrans Pro V6 · ${ts}*\n`;
  return { content: md, mime: 'text/markdown;charset=utf-8', ext: 'md' };
}

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
  URL.revokeObjectURL(url);
}

// ── 导出预览 ──
let _previewAbortController = null;

function openPreviewModal(result) {
  if (_previewAbortController) _previewAbortController.abort();
  _previewAbortController = new AbortController();
  const { signal } = _previewAbortController;

  let modal = document.getElementById('exportPreviewModal');
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

  document.getElementById('closePreviewBtn').addEventListener('click', () => modal.classList.remove('active'), { signal });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); }, { signal });

  document.getElementById('exportPreviewBody').textContent = result.content;
  document.getElementById('previewCharCount').textContent = `${result.content.length.toLocaleString()} 字`;

  document.getElementById('previewCopyBtn').addEventListener('click', async () => {
    const r = await copyToClipboard(result.content);
    showToast(r.success ? '已复制 ✓' : '复制失败，请手动复制', r.success ? 'success' : 'error');
  }, { signal });

  document.getElementById('previewDownloadBtn').addEventListener('click', () => {
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
      document.getElementById('exportBtnLabel').textContent = `下载 ${labels[currentExportFmt]}`;
    });
  });

  document.getElementById('exportBtn').addEventListener('click', () => {
    const result = buildExportContent(currentExportFmt);
    if (!result) return;
    triggerDownload(result.content, result.mime, result.ext);
    showToast('报告已导出 ✓', 'success');
  });

  document.getElementById('exportCopyBtn').addEventListener('click', async () => {
    const result = buildExportContent(currentExportFmt);
    if (!result) return;
    const r = await copyToClipboard(result.content);
    showToast(r.success ? '已复制到剪贴板 ✓' : '复制失败，请手动复制', r.success ? 'success' : 'error');
  });

  document.getElementById('exportPreviewBtn').addEventListener('click', () => {
    const result = buildExportContent(currentExportFmt);
    if (!result) return;
    openPreviewModal(result);
  });
}
