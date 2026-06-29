/**
 * 翻译工具函数 — 纯逻辑、零 DOM/API 依赖
 */
import { LABEL_STRIP_RE } from './markdown.js';

// ── 自适应模式 ──
export const ADAPTIVE_MODES = [
  { key: 'refined', label: '✦ 精炼', maxLen: 500, maxRounds: null, critique: true, implicit: true },
  { key: 'standard', label: '◈ 标准', maxLen: 2000, maxRounds: 2, critique: true, implicit: true },
  { key: 'efficient', label: '◇ 效率', maxLen: 5000, maxRounds: 1, critique: false, implicit: true },
  { key: 'light', label: '○ 轻量', maxLen: 12000, maxRounds: 1, critique: false, implicit: false },
  { key: 'chunk', label: '⬡ 分块', maxLen: Infinity, maxRounds: 1, critique: false, implicit: false },
];

export function resolveAdaptiveMode(textLen, userRounds) {
  const mode = ADAPTIVE_MODES.find(m => textLen <= m.maxLen);
  const rounds = mode.maxRounds === null ? userRounds : Math.min(userRounds, mode.maxRounds);
  return { ...mode, rounds };
}

// ═════════════════════════════════════════
// 分块翻译
// ═════════════════════════════════════════

export function smartSplitIntoChunks(text, targetLen = 1200, maxLen = 1600) {
  const rawParas = text.split(/\n{2,}/).filter(p => p.trim());
  const paras = [];
  for (const para of rawParas) {
    if (para.length <= maxLen) paras.push(para.trim());
    else paras.push(...splitParaBySentences(para, targetLen));
  }
  const chunks = [];
  let cur = '';
  for (const para of paras) {
    if (cur.length + para.length + 2 <= targetLen || cur.length === 0) {
      cur += (cur ? '\n\n' : '') + para;
    } else {
      chunks.push(cur.trim());
      cur = para;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

function splitParaBySentences(para, targetLen) {
  const breaks = [];
  const regex = /[。！？；.!?]/g;
  let m;
  while ((m = regex.exec(para)) !== null) {
    const before = para.slice(Math.max(0, m.index - 3), m.index);
    if (/\b(Dr|Mr|Mrs|Ms|Prof|Jr|Sr|vs|etc|i\.e|e\.g|No|vol|pp|Ch|Fig|Tab)\b/i.test(before)) continue;
    breaks.push(m.index + 1);
  }
  const parts = [];
  let start = 0;
  for (const bp of breaks) {
    if (bp - start >= targetLen * 0.5 && parts.length === 0) {
      parts.push(para.slice(start, bp).trim());
      start = bp;
    } else if (bp - start >= targetLen) {
      parts.push(para.slice(start, bp).trim());
      start = bp;
    }
  }
  const remaining = para.slice(start).trim();
  if (remaining) parts.push(remaining);
  if (parts.length === 0) parts.push(para.trim());
  return parts;
}

export function cleanStreamingArtifacts(text) {
  return text
    .replace(/￼/g, '')
    .replace(/\s*\(系统\)\s*$/gmi, '')
    .replace(/\s*\(用户\)\s*$/gmi, '')
    .replace(/^[\s,，、；;。.！!？?）)\]}>》」』】〙〗〛'"]+/gm, '')
    .replace(/[\s,，、；;。.！!？?（(\[{<《「『【〘〖〚‘" ]+$/gm, '')
    .trim();
}

export function promptChunkSynthesis(src, tgt, termTable) {
  const terms = termTable && termTable.length > 0
    ? `\n\n以下术语表必须严格执行（已在上述翻译中尽量体现）：\n${termTable.map(t => `${t.src} → ${t.tgt}`).join('\n')}`
    : '';
  return `你是翻译综合裁决专家。你的任务是将多个版本的译文融合为最优版本。${terms}`;
}

export function extractKeyTerms(text) {
  const terms = [];
  const patterns = [
    /\b[A-Z]{2,}(?:\s+[A-Z]{2,})*\b/g,
    /["""]([^"""]{2,30})["""]/g,
    /[（(]([^)]{2,20})[)）]/g,
  ];
  const seen = new Set();
  patterns.forEach((pat) => {
    text.match(pat)?.forEach((m) => {
      const clean = m.replace(/["""()（）]/g, '').trim();
      if (clean.length >= 2 && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        terms.push(clean);
      }
    });
  });
  return terms.slice(0, 12);
}

export function buildContextMemory(i, total, chunkResults, termTable) {
  const memory = { prevChunk: '', summary: '' };
  if (i > 0 && chunkResults[i - 1]) {
    memory.prevChunk = chunkResults[i - 1].slice(-300);
  }
  if (total > 1) {
    memory.summary = `上下文：第 ${i + 1}/${total} 段${memory.prevChunk ? `，前段尾：${memory.prevChunk}` : ''}`;
  }
  return memory;
}

export function longestCommonSubstring(a, b) {
  const m = a.length, n = b.length;
  let maxLen = 0, endIdx = 0;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxLen) { maxLen = dp[i][j]; endIdx = i; }
      }
    }
  }
  return a.slice(endIdx - maxLen, endIdx);
}

export function auditChunkConsistency(chunkResults) {
  const issues = [];
  for (let i = 1; i < chunkResults.length; i++) {
    const prev = chunkResults[i - 1];
    const curr = chunkResults[i];
    const overlap = longestCommonSubstring(prev.slice(-100), curr.slice(0, 100));
    if (overlap.length >= 15) {
      issues.push({ type: 'overlap', index: i, text: overlap });
    }
  }
  return issues;
}

export function mergeChunksSmart(chunkResults, issues) {
  const issueSet = new Set(issues.filter(i => i.type === 'overlap').map(i => i.index));
  return chunkResults.map((chunk, i) => {
    if (issueSet.has(i)) {
      const overlap = issues.find(i2 => i2.index === i);
      if (overlap) return chunk.replace(overlap.text, '');
    }
    return chunk;
  }).join('\n\n');
}

// ═════════════════════════════════════════
// 解析函数
// ═════════════════════════════════════════

export function parseSynthOutput(raw) {
  const memoIndex = raw.lastIndexOf('【备忘录】');
  let translation = raw;
  let memo = '';
  if (memoIndex !== -1) {
    const m = raw.slice(memoIndex + 5).trim();
    const is = m.match(/遗留问题[：:]([\s\S]*?)(?=待优化片段|下轮策略|$)/)?.[1]?.trim() || '';
    const sg = m.match(/待优化片段[：:]([\s\S]*?)(?=下轮策略|遗留问题|$)/)?.[1]?.trim() || '';
    const st = m.match(/下轮策略[：:]([\s\S]*?)$/)?.[1]?.trim() || '';
    const p = [];
    if (is) p.push(`遗留问题：${is}`);
    if (sg) p.push(`待优化片段：${sg}`);
    if (st) p.push(`下轮策略：${st}`);
    memo = p.join('\n') || m;
    translation = raw.slice(0, memoIndex).trim();
  } else {
    const altMemoIndex = raw.lastIndexOf('\n备忘录：');
    if (altMemoIndex !== -1) {
      memo = raw.slice(altMemoIndex + 5).trim();
      translation = raw.slice(0, altMemoIndex).trim();
    }
  }
  translation = translation.replace(LABEL_STRIP_RE, '');
  translation = translation.replace(/^[\[【「][^\]]{1,15}[]】」]?[:：]?\s*/m, '');
  return { translation, memo };
}

export function parseAuditOutput(raw) {
  let scoreMatch = raw.match(/忠实度\s*[:：]\s*(\d+).*?流畅度\s*[:：]\s*(\d+).*?地道度\s*[:：]\s*(\d+)/s);
  if (!scoreMatch) {
    scoreMatch = raw.match(/(\d+)\s*[/、,，]\s*(\d+)\s*[/、,，]\s*(\d+)/);
  }
  const remarkMatch = raw.match(/REMARK\s*[:：]\s*([\s\S]+)/i);
  let remark = remarkMatch ? remarkMatch[1].trim().replace(/]$/, '').trim() : '（评语解析失败，请查看原始输出）';
  const scores = scoreMatch
    ? [parseInt(scoreMatch[1]), parseInt(scoreMatch[2]), parseInt(scoreMatch[3])].map(s => Math.min(10, Math.max(0, s)))
    : null;
  return { scores, remark };
}
