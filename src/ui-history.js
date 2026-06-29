/**
 * 翻译历史记录面板
 */
import { state } from './state.js';
import { safeStore, safeRemove } from './storage.js';
import { LANGS } from './langs.js';
import { escHtml, showToast, updateLangDisplay, updateWordStats, updateTranslateBtnState, updateHistoryBadge, releaseFocus } from './utils.js';
import { ID } from './dom-ids.js';

export function renderHistoryList() {
  const h = JSON.parse(localStorage.getItem('prism_history') || '[]');
  const list = document.getElementById(ID.HISTORY_LIST);
  if (h.length === 0) {
    list.innerHTML = '<div class="history-empty">暂无翻译历史</div>';
    return;
  }
  list.innerHTML = '';
  h.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';
    const scoresHtml = item.scores
      ? `<div style="margin-top:4px;display:flex;gap:3px;">${['忠', '流', '地']
          .map((l, i) => `<span style="font-size:9px;padding:1px 5px;border-radius:9999px;background:#f9ede7;color:var(--terracotta);font-family:var(--mono);">${l}${item.scores[i]}</span>`)
          .join('')}</div>`
      : '';
    const remarkHtml = item.remark
      ? `<div style="font-size:10px;color:var(--stone);margin-top:4px;line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escHtml(item.remark.slice(0, 80))}${item.remark.length > 80 ? '...' : ''}</div>`
      : '';

    el.innerHTML =
      '<div class="history-item-meta">' +
        '<div class="history-langs">' + escHtml(item.srcCode) + ' → ' + escHtml(item.tgtCode) + '</div>' +
        '<div class="history-time">' + escHtml(item.time) + '</div>' +
        scoresHtml +
      '</div>' +
      '<div class="history-item-content">' +
        '<div class="history-src">' + escHtml(item.src.slice(0, 60)) + (item.src.length > 60 ? '...' : '') + '</div>' +
        '<div class="history-tgt">' + escHtml(item.tgt.slice(0, 60)) + (item.tgt.length > 60 ? '...' : '') + '</div>' +
        remarkHtml +
      '</div>' +
      '<div class="history-actions">' +
        '<button class="history-use-btn" data-id="' + item.id + '">使用</button>' +
        '<button class="history-del-btn" data-id="' + item.id + '">删除</button>' +
      '</div>';
    const useBtn = el.querySelector('.history-use-btn');
    const delBtn = el.querySelector('.history-del-btn');
    useBtn.addEventListener('click', () => {
      document.getElementById(ID.SOURCE_TEXT).value = item.src;
      document.getElementById(ID.CHAR_NUM).textContent = item.src.length;
      const srcL = LANGS.find(l => l.code === item.srcCode) || LANGS[0];
      const tgtL = LANGS.find(l => l.code === item.tgtCode) || LANGS[1];
      state.srcLang = srcL;
      state.tgtLang = tgtL;
      updateLangDisplay();
      closeHistoryModal();
      updateWordStats();
      updateTranslateBtnState();
      safeStore('session', 'prism_text_cache', item.src);
      showToast('已加载历史记录', 'success');
    });
    delBtn.addEventListener('click', () => {
      let nh = JSON.parse(localStorage.getItem('prism_history') || '[]').filter(x => x.id !== item.id);
      try { localStorage.setItem('prism_history', JSON.stringify(nh.slice(0, 30))); } catch (_) { }
      updateHistoryBadge();
      renderHistoryList();
    });
    list.appendChild(el);
  });
}

export function closeHistoryModal() {
  document.getElementById(ID.HISTORY_MODAL).classList.remove('active');
  releaseFocus();
}
