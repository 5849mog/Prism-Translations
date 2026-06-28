/**
 * 翻译辅助函数 — DOM 操作、持久化、历史记录
 */
import { state } from './state.js';
import {
  LABEL_STRIP_RE,
  safeHtml, showToast, updateUI,
  _markedLib, renderMarkdown, renderMarkdownStream, ensureMarked, ensureDOMPurify,
} from './utils.js';

// ═══════════════════════════════════════════════════════════
// UI 初始化
// ═══════════════════════════════════════════════════════════

export function initTranslationUI() {
  document.getElementById('resultSection').classList.remove('active');
  const initialLabelEl = document.querySelector('.result-label');
  initialLabelEl.innerHTML = '最终裁决译文';
  delete initialLabelEl.dataset.earlyPreview;
  document.getElementById('finalResult').textContent = '';
  document.getElementById('roundsContainer').innerHTML = '';
  document.getElementById('auditContainer').innerHTML = '';
  document.getElementById('exportSection').style.display = 'none';
  document.getElementById('adaptiveBadge').style.display = 'none';
  document.getElementById('sp0').textContent = '忠 —';
  document.getElementById('sp1').textContent = '流 —';
  document.getElementById('sp2').textContent = '地 —';
  ['sp0', 'sp1', 'sp2'].forEach(id => document.getElementById(id).classList.remove('loaded'));
}

export function createRoundDOM(r, dynamicAgent) {
  const roundEl = document.createElement('div');
  roundEl.className = 'round-card';
  roundEl.innerHTML = safeHtml`
    <div class="round-header round-toggle">
      <div class="round-num">${r + 1}</div>
      <div class="round-title">第 ${r + 1} 轮</div>
      <div class="round-badge" id="rbadge${r}">翻译中</div>
      <svg class="round-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="margin-left:auto;color:var(--stone);"><path d="m6 9 6 6 6-6"/></svg>
    </div>
    <div class="round-body" id="rbody${r}">
      <div class="paths-row">
        <div class="path-item"><div class="path-label"><span>甲 · 语言学家</span><span class="path-lock">并发</span></div><div class="path-text streaming" id="pa${r}"></div></div>
        <div class="path-item"><div class="path-label"><span>乙 · 本土编辑</span><span class="path-lock">并发</span></div><div class="path-text streaming" id="pb${r}"></div></div>
        <div class="path-item"><div class="path-label"><span>丙 · 领域专家</span><span class="path-lock">并发</span></div><div class="path-text streaming" id="pc${r}"></div></div>
        <div class="path-item path-item--dynamic"><div class="path-label"><span>D · ${dynamicAgent.name}</span><span class="path-lock path-lock--dynamic">动态</span></div><div class="path-text streaming" id="pd${r}"></div></div>
        <div class="path-item path-item--implicit"><div class="path-label"><span>戊 · 隐义探微</span><span class="path-lock path-lock--implicit">后处理</span></div><div class="path-text streaming" id="pe${r}"></div></div>
        <div class="path-item path-item--style"><div class="path-label"><span>己 · 风格摹写</span><span class="path-lock path-lock--style">并发</span></div><div class="path-text streaming" id="pf${r}"></div></div>
      </div>
      <div class="critique-row">
        <div class="critique-item"><div class="critique-label">甲 审 乙/丙</div><div class="critique-text streaming" id="ca${r}"></div></div>
        <div class="critique-item"><div class="critique-label">乙 审 丙/丁</div><div class="critique-text streaming" id="cb${r}"></div></div>
        <div class="critique-item"><div class="critique-label">丙 审 丁/己</div><div class="critique-text streaming" id="cc${r}"></div></div>
        <div class="critique-item"><div class="critique-label">丁 审 甲/乙</div><div class="critique-text streaming" id="cd${r}"></div></div>
        <div class="critique-item"><div class="critique-label">己 审 甲/丙</div><div class="critique-text streaming" id="cf${r}"></div></div>
      </div>
      <div class="synth-row">
        <div class="synth-label"><span class="synth-label-text">综合裁决</span><span class="synth-lock">首席裁决</span></div>
        <div class="synth-text streaming" id="synth${r}"></div>
      </div>
      <div class="memo-row" id="memo-row${r}" style="display:none">
        <div class="memo-label">迭代备忘录</div>
        <div class="memo-text" id="memo${r}"></div>
      </div>
    </div>
  `;
  document.getElementById('roundsContainer').appendChild(roundEl);
  roundEl.scrollIntoView({ behavior: 'smooth', block: 'end' });

  roundEl.querySelector('.round-toggle').addEventListener('click', (e) => {
    if (e.target.closest('.round-badge')) return;
    const body = roundEl.querySelector('.round-body');
    const icon = roundEl.querySelector('.round-toggle-icon');
    const isCollapsed = body.style.maxHeight === '0px';
    if (isCollapsed) {
      body.style.maxHeight = body.scrollHeight + 'px';
      icon.classList.remove('collapsed');
    } else {
      body.style.maxHeight = '0px';
      icon.classList.add('collapsed');
    }
  });
  return {
    pa: document.getElementById(`pa${r}`),
    pb: document.getElementById(`pb${r}`),
    pc: document.getElementById(`pc${r}`),
    pd: document.getElementById(`pd${r}`),
    pe: document.getElementById(`pe${r}`),
    pf: document.getElementById(`pf${r}`),
    ca: document.getElementById(`ca${r}`),
    cb: document.getElementById(`cb${r}`),
    cc: document.getElementById(`cc${r}`),
    cd: document.getElementById(`cd${r}`),
    cf: document.getElementById(`cf${r}`),
    synth: document.getElementById(`synth${r}`),
  };
}

export function showEarlyPreview(f) {
  document.getElementById('resultSection').classList.add('active');
  const cleanedF = f.replace(LABEL_STRIP_RE, '');
  if (_markedLib) {
    document.getElementById('finalResult').innerHTML = `<div class="md-content">${renderMarkdownStream(cleanedF)}</div>`;
  } else {
    document.getElementById('finalResult').textContent = cleanedF;
    ensureMarked().then(() => {
      document.getElementById('finalResult').innerHTML = `<div class="md-content">${renderMarkdownStream(cleanedF)}</div>`;
    });
  }
  const labelEl = document.querySelector('.result-label');
  if (!labelEl.dataset.earlyPreview) {
    labelEl.dataset.earlyPreview = 'true';
    labelEl.innerHTML = `初步草稿 <span class="score-pill" style="color:var(--warning); border-color:var(--warning); background:var(--warm-sand); animation: blink 1.5s infinite; border-radius:4px; padding:2px 6px; margin-left:6px;">精炼中...</span>`;
  }
}

export function getCritiquesAboutMe(pathId, lastCritiques) {
  const filterSelfReview = (text) =>
    text.split('\n').filter(line => !line.trimStart().startsWith('【自审-')).join('\n').trim();
  const raw = {
    A: [
      lastCritiques.C && filterSelfReview(lastCritiques.C) && `【上轮·C（领域专家）对你（A·语言学家）的批评意见】\n${filterSelfReview(lastCritiques.C)}`,
      lastCritiques.D && filterSelfReview(lastCritiques.D) && `【上轮·D（专属译者）对你（A·语言学家）的批评意见】\n${filterSelfReview(lastCritiques.D)}`,
      lastCritiques.F && filterSelfReview(lastCritiques.F) && `【上轮·F（风格镜像师）对你（A·语言学家）的批评意见】\n${filterSelfReview(lastCritiques.F)}`,
    ],
    B: [
      lastCritiques.A && filterSelfReview(lastCritiques.A) && `【上轮·A（语言学家）对你（B·本土编辑）的批评意见】\n${filterSelfReview(lastCritiques.A)}`,
      lastCritiques.D && filterSelfReview(lastCritiques.D) && `【上轮·D（专属译者）对你（B·本土编辑）的批评意见】\n${filterSelfReview(lastCritiques.D)}`,
    ],
    C: [
      lastCritiques.A && filterSelfReview(lastCritiques.A) && `【上轮·A（语言学家）对你（C·领域专家）的批评意见】\n${filterSelfReview(lastCritiques.A)}`,
      lastCritiques.B && filterSelfReview(lastCritiques.B) && `【上轮·B（本土编辑）对你（C·领域专家）的批评意见】\n${filterSelfReview(lastCritiques.B)}`,
      lastCritiques.F && filterSelfReview(lastCritiques.F) && `【上轮·F（风格镜像师）对你（C·领域专家）的批评意见】\n${filterSelfReview(lastCritiques.F)}`,
    ],
    D: [
      lastCritiques.B && filterSelfReview(lastCritiques.B) && `【上轮·B（本土编辑）对你（D）的批评意见】\n${filterSelfReview(lastCritiques.B)}`,
      lastCritiques.C && filterSelfReview(lastCritiques.C) && `【上轮·C（领域专家）对你（D）的批评意见】\n${filterSelfReview(lastCritiques.C)}`,
    ],
    F: [
      lastCritiques.C && filterSelfReview(lastCritiques.C) && `【上轮·C（领域专家）对你（F·风格镜像师）的批评意见】\n${filterSelfReview(lastCritiques.C)}`,
      lastCritiques.D && filterSelfReview(lastCritiques.D) && `【上轮·D（专属译者）对你（F·风格镜像师）的批评意见】\n${filterSelfReview(lastCritiques.D)}`,
    ],
  };
  return (raw[pathId] || []).filter(Boolean).join('\n\n');
}

// ── 保存翻译结果 ──
export function saveTranslationResult(text, src, tgt, lastSynthResult, scores, remark, elapsed, mode, dynamicAgent, roundUsageSnapshots) {
  const entry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    src, tgt,
    sourceText: text.slice(0, 500),
    result: lastSynthResult.slice(0, 500),
    scores, remark,
    elapsed,
    mode: mode.key,
    agent: dynamicAgent.name,
    usage: roundUsageSnapshots,
  };
  addHistory(entry);
  state.lastTranslation = {
    format: 'text',
    result: lastSynthResult,
    scores, remark,
    src, tgt,
    sourceText: text,
    agent: dynamicAgent,
    rounds: roundUsageSnapshots,
    mode: mode.key,
  };
}

// ── 统一错误处理 ──
export function handleTranslationError(err) {
  if (err.name === 'AbortError') return;
  const msg = err.message || String(err);
  showToast(msg.length > 80 ? msg.slice(0, 80) + '…' : msg);
}

// ── 历史记录 ──
export function getHistory() {
  try {
    const raw = localStorage.getItem('prism_history');
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

export function saveHistory(history) {
  try {
    localStorage.setItem('prism_history', JSON.stringify(history));
  } catch (_) { /* silent */ }
}

export function addHistory(entry) {
  const history = getHistory();
  history.unshift(entry);
  if (history.length > 30) history.length = 30;
  saveHistory(history);
}
