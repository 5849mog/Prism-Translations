/**
 * 评分卡 DOM 构建与渲染 — 统一 translation-phases.js 和 translation-chunked.js 的重复代码
 */
import { ID } from './dom-ids.js';
import { _markedLib, renderMarkdown, ensureMarked } from './markdown.js';

/** 评分标签（短名，用于相位条 sp0/sp1/sp2） */
export const SCORE_SHORT_LABELS = ['忠', '流', '地'];

/** 评分标签（全长，用于评分卡内） */
export const SCORE_FULL_LABELS = ['忠实度', '流畅度', '地道度'];

/**
 * 创建评分卡 DOM 结构
 * @param {string} title      卡片标题（如 "质量评审报告"）
 * @param {string} [badge]    徽章文字（如 "标准", "分块 · 3 段"）
 * @returns {{ card: HTMLElement, remarkEl: HTMLElement }} 卡片容器 & 评语元素
 */
export function createAuditCard(title, badge) {
  const card = document.createElement('div');
  card.className = 'audit-card';
  card.innerHTML = `
    <div class="audit-header">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c96442" stroke-width="1.5" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <span class="audit-title">${title}</span>
      ${badge ? `<span class="round-badge">${badge}</span>` : ''}
    </div>
    <div class="audit-body">
      <div class="score-row">
        <div class="score-item" id="si0"><span class="score-num" id="s0">—</span><span class="score-label">${SCORE_FULL_LABELS[0]}</span><div class="score-bar-wrap"><div class="score-bar" id="sb0"></div></div></div>
        <div class="score-item" id="si1"><span class="score-num" id="s1">—</span><span class="score-label">${SCORE_FULL_LABELS[1]}</span><div class="score-bar-wrap"><div class="score-bar" id="sb1"></div></div></div>
        <div class="score-item" id="si2"><span class="score-num" id="s2">—</span><span class="score-label">${SCORE_FULL_LABELS[2]}</span><div class="score-bar-wrap"><div class="score-bar" id="sb2"></div></div></div>
      </div>
      <div class="audit-remark streaming" id="auditRemark"></div>
    </div>
  `;
  const remarkEl = card.querySelector('#auditRemark');
  return { card, remarkEl };
}

/**
 * 在评分卡内渲染分数（含动画）
 * @param {[number,number,number]|null} scores  [忠实度, 流畅度, 地道度] 0-10
 */
export function renderScores(scores) {
  if (scores) {
    scores.forEach((s, i) => {
      const isExcellent = s >= 9;
      const sEl = document.getElementById(`s${i}`);
      const siEl = document.getElementById(`si${i}`);
      const sbEl = document.getElementById(`sb${i}`);
      sEl.textContent = s;
      if (isExcellent) {
        sEl.classList.add('excellent');
        siEl.classList.add('excellent');
        sbEl.classList.add('excellent');
      }
      // scaleX 由 CSS transition 驱动（engine.css），不再内联覆盖
      setTimeout(() => {
        sbEl.style.transform = `scaleX(${s / 10})`;
      }, i * 180);
      const spEl = document.getElementById(`sp${i}`);
      spEl.textContent = `${SCORE_SHORT_LABELS[i]} ${s}`;
      spEl.classList.add('loaded');
    });
  } else {
    SCORE_SHORT_LABELS.forEach((label, i) => {
      document.getElementById(`s${i}`).textContent = '?';
      const spEl = document.getElementById(`sp${i}`);
      spEl.textContent = `${label} ?`;
      spEl.classList.add('loaded');
    });
  }
}

/**
 * 在评语元素中渲染 Markdown
 * @param {HTMLElement} remarkEl
 * @param {string} remark
 */
export function renderRemark(remarkEl, remark) {
  if (_markedLib) {
    if (remarkEl.hasAttribute('data-has-reasoning')) {
      remarkEl.querySelector('.content-text').innerHTML = `<div class="md-content">${renderMarkdown(remark || '')}</div>`;
    } else {
      remarkEl.innerHTML = `<div class="md-content">${renderMarkdown(remark || '')}</div>`;
    }
  }
}
