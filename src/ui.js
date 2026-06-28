/**
 * UI 管理器 — 事件绑定、初始化、模态框
 */
import { state, safeStore, safeRemove, safeGet, safeGetJSON } from './state.js';
import { LANGS } from './langs.js';
import {
  showToast, escHtml, safeHtml, trapFocus, releaseFocus, copyToClipboard,
  updateLangDisplay, updateWordStats, updateTranslateBtnState,
  updateHistoryBadge, updateUI,
  openDrawer, closeDrawer, getPanelRight, log,
  _markedLib, renderMarkdown, renderMarkdownStream, ensureMarked, ensureDOMPurify,
} from './utils.js';
import {
  PROVIDER_REGISTRY, findProvider, getProviderName, getProviderDescription,
  getProviderSupportsThinking, getProviderModels, testApiConnection,
} from './providers.js';
import { doTranslate, doStop } from './translation.js';
import { handleFileSelect, loadFileText, detectLang, detectAndApplyLang } from './file-parser.js';
import { setupExportListeners, currentExportFmt } from './export.js';

// ═════════════════════════════════════════
// 示例文本库
// ═════════════════════════════════════════
const DEMO_LIBRARY = [
  {
    key: 'speech', icon: '🎤', title: '科技演讲', desc: 'AI 发展主题，含引用与数据', tags: ['中→英', '正式'],
    srcLang: 'zh', tgtLang: 'en',
    text: `在世界人工智能大会的开幕式上，百度创始人李彦宏发表了题为《译者时代》的主旨演讲。他指出，大语言模型已经从"炫技"阶段迈入"应用"阶段，而译者（Agent）将成为连接用户与服务的核心枢纽。\n\n"未来的互联网将不再是你去搜索信息，而是译者主动为你完成任务。"李彦宏以医疗健康领域为例，阐述了 AI 译者如何帮助患者完成从症状描述、医院推荐到挂号预约的全流程服务。他强调，这一转变需要解决三大挑战：数据隐私保护、多模态交互能力、以及可解释性。\n\n演讲尾声，他引用了一句古希腊哲言："认识你自己。"并补充道，"而在 AI 时代，我们更需要让 AI 认识每一个独特的你。"`,
  },
  {
    key: 'literature', icon: '📖', title: '文学经典', desc: '《小王子》法语原文，诗意与哲理', tags: ['法→中', '文学'],
    srcLang: 'fr', tgtLang: 'zh',
    text: `On ne voit bien qu'avec le coeur. L'essentiel est invisible pour les yeux.\n\nLes hommes ont oublié cette vérité, dit le renard. Mais tu ne dois pas l'oublier. Tu deviens responsable pour toujours de ce que tu as apprivoisé. Tu es responsable de ta rose...\n\nJe suis responsable de ma rose, répéta le petit prince, afin de se souvenir.`,
  },
  {
    key: 'scifi', icon: '🚀', title: '科幻巨著', desc: '《三体》经典片段，硬科幻风格', tags: ['中→英', '叙事'],
    srcLang: 'zh', tgtLang: 'en',
    text: `汪淼觉得，来找他的这四个人是一个奇怪的组合：两名警察和两名军人。如果那两个军人是武警还正常一些，但这是两名陆军军官。\n\n汪淼第一眼就对来人没有好感。其实那名长得五大三粗的警官，让人家第一眼就喜欢的可能性也不大。另一名警官倒是很年轻，长的也挺帅。但汪淼一看就是那种少言寡语的人，从进到汪淼家开始，就没有说过一句话。\n\n"汪淼？"那名粗壮的警察问。"是我。""请跟我们走一趟。"`,
  },
  {
    key: 'techdoc', icon: '⚙️', title: '技术文档', desc: 'API 接口说明，术语密集', tags: ['英→中', '技术'],
    srcLang: 'en', tgtLang: 'zh',
    text: `The RequestRateLimiter GatewayFilter factory uses a RateLimiter implementation to determine if the current request is allowed to proceed. If not, it returns HTTP 429 - Too Many Requests status.\n\nThe filter takes an optional keyResolver parameter and parameters specific to the rate limiter implementation (see Redis RateLimiter).\n\nKeyResolver is a functional interface that allows you to derive the key for limiting requests. The default implementation uses the Principal name from ServerWebExchange. KeyResolver is a bean that implements the KeyResolver interface.`,
  },
  {
    key: 'business', icon: '💼', title: '商务信函', desc: '正式邮件，礼貌用语与格式', tags: ['英→中', '商务'],
    srcLang: 'en', tgtLang: 'zh',
    text: `Dear Dr. Chen,\n\nI hope this message finds you well. I am writing on behalf of Meridian Technologies to formally propose a strategic partnership between our organizations.\n\nFollowing our productive discussion at the Geneva Summit last month, our board has unanimously approved the framework for collaborative research in quantum encryption protocols. We believe that combining Meridian's hardware infrastructure with your team's cryptographic expertise would yield significant advancements in the field.\n\nWe would be honored to host you and your colleagues at our headquarters in Zurich on Thursday, 15th October, for a detailed presentation of our joint venture proposal. Please let us know your availability at your earliest convenience.\n\nYours sincerely,\nAlexandra Whitfield\nDirector of International Partnerships\nMeridian Technologies AG`,
  },
  {
    key: 'poetry', icon: '🏮', title: '古典诗词', desc: '唐诗宋词，意境深远', tags: ['中→英', '文学'],
    srcLang: 'zh', tgtLang: 'en',
    text: `静夜思\n李白\n\n床前明月光，疑是地上霜。\n举头望明月，低头思故乡。\n\n——\n\n水调歌头·明月几时有（节选）\n苏轼\n\n明月几时有？把酒问青天。\n不知天上宫阙，今夕是何年。\n我欲乘风归去，又恐琼楼玉宇，高处不胜寒。\n起舞弄清影，何似在人间。`,
  },
  {
    key: 'philosophy', icon: '🏛️', title: '哲学思辨', desc: '尼采片段，抽象深邃', tags: ['德→中', '哲学'],
    srcLang: 'de', tgtLang: 'zh',
    text: `Wer mit Ungeheuern kämpft, mag zusehn, dass er nicht dabei zum Ungeheuer wird. Und wenn du lange in einen Abgrund blickst, blickt der Abgrund auch in dich hinein.\n\nEs ist immer etwas Wahnsinn in der Liebe. Es ist aber auch immer etwas Vernunft im Wahnsinn.\n\nDer Mensch ist ein Seil, geknüpft zwischen Tier und Übermensch — ein Seil über einem Abgrunde.`,
  },
  {
    key: 'multilang', icon: '🌐', title: '多语混杂', desc: '日韩英混排，测试语言检测', tags: ['混合', '检测'],
    srcLang: 'ja', tgtLang: 'zh',
    text: `AI 技術の発展は私達の生活を大きく変えました。特に 번역 분야에서 혁명적인 변화가 일어났습니다.\n\nThe convergence of neural networks and natural language processing has created unprecedented capabilities in machine translation. However, true mastery of language requires more than statistical patterns — it demands an understanding of culture, context, and the human condition.\n\n技术进步虽然惊人，但最终决定翻译质量的，依然是对语言背后文化的深刻理解】`,
  },
];

// ── 初始化 ──
export function init() {
  // Set src/tgt defaults
  state.srcLang = LANGS[0];
  state.tgtLang = LANGS[1];

  document.getElementById('roundsDisplay').textContent = state.rounds;
  if (state.apiKey) document.getElementById('apiKeyInput').value = state.apiKey;
  document.getElementById('modelSelect').value = state.model;
  document.getElementById('thinkingSelect').value = state.thinkingMode;
  document.getElementById('providerSelect').value = state.provider;
  if (state.customPrompt) document.getElementById('customPromptInput').value = state.customPrompt;
  if (state.glossary) document.getElementById('glossaryInput').value = state.glossary;
  updateLangDisplay();
  updateHistoryBadge();
  updateModelOptions();
  updateTranslateBtnState();
  buildProviderCards();
  updateProviderConfigPanel(state.provider);

  const chipEl = document.getElementById('modelChip');
  if (chipEl) chipEl.textContent = state.model || 'deepseek-v4-flash';
}

// ── 文本缓存恢复 ──
(function restoreTextCache() {
  const cached = safeGet('session', 'prism_text_cache', null);
  if (cached && cached.trim()) {
    const el = document.getElementById('sourceText');
    if (el && !el.value.trim()) {
      el.value = cached;
      updateWordStats();
    }
  }
})();

// ── Provider 模型联动 ──
function updateModelOptions() {
  const provider = document.getElementById('providerSelect').value;
  const modelSelect = document.getElementById('modelSelect');
  const allowedModels = getProviderModels(provider);
  let hasVisible = false;
  let firstVisible = null;
  for (let i = 0; i < modelSelect.options.length; i++) {
    const opt = modelSelect.options[i];
    const optProvider = opt.getAttribute('data-provider');
    const show = (optProvider && optProvider === provider) || allowedModels.indexOf(opt.value) !== -1;
    opt.style.display = show ? '' : 'none';
    opt.disabled = !show;
    if (show) { hasVisible = true; if (!firstVisible) firstVisible = opt; }
  }
  const currentVal = modelSelect.value;
  const currentOpt = modelSelect.querySelector('option[value="' + currentVal.replace(/"/g, '&quot;') + '"]');
  if (!currentOpt || currentOpt.disabled) { if (firstVisible) modelSelect.value = firstVisible.value; }
  const keyLabel = document.getElementById('apiKeyLabel');
  if (keyLabel) keyLabel.textContent = getProviderName(provider) + ' API 密钥';
  const modelDesc = document.getElementById('modelSelectDesc');
  if (modelDesc) modelDesc.textContent = getProviderDescription(provider);
  const thinkRow = document.getElementById('thinkingSelect') ? document.getElementById('thinkingSelect').closest('.setting-row.stacked') : null;
  if (thinkRow) thinkRow.style.display = getProviderSupportsThinking(provider) ? '' : 'none';
}

// ── Provider 卡片 ──
function buildProviderCards() {
  const grid = document.getElementById('providerGrid');
  if (!grid) return;
  grid.innerHTML = '';
  PROVIDER_REGISTRY.forEach(p => {
    const isActive = p.id === state.provider;
    const hasKey = !!state.apiKey;
    const isVerified = state.lastTestedProvider === p.id;
    const card = document.createElement('div');
    card.className = 'provider-card' + (isActive ? ' active' : '');
    card.setAttribute('data-provider-id', p.id);
    const statusClass = isVerified ? 'connected' : 'disconnected';
    const statusText = isVerified ? '✓ 已验证' : (hasKey ? '○ 已配置' : '○ 未配置');
    card.innerHTML =
      '<div class="provider-card-icon">' + p.id.toUpperCase() + '</div>' +
      '<div class="provider-card-name">' + escHtml(p.name) + '</div>' +
      '<div class="provider-card-models">' + escHtml(p.models.join(' / ')) + '</div>' +
      '<div class="provider-card-status ' + statusClass + '">' + statusText + '</div>';
    card.addEventListener('click', function () {
      if (state.provider === p.id) return;
      state.provider = p.id;
      document.getElementById('providerSelect').value = p.id;
      updateModelOptions();
      updateProviderConfigPanel(p.id);
      updateTranslateBtnState();
      autoSaveSettings();
      grid.querySelectorAll('.provider-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
    grid.appendChild(card);
  });
}

function updateProviderConfigPanel(providerId) {
  const p = findProvider(providerId);
  if (!p) return;
  const header = document.getElementById('providerConfigHeader');
  if (header) header.textContent = p.name + ' · ' + p.description;
  const label = document.getElementById('apiKeyLabel');
  if (label) label.textContent = p.name + ' API 密钥';
  const endpointInput = document.getElementById('customEndpointInput');
  if (endpointInput && state.customBaseUrls) {
    endpointInput.value = state.customBaseUrls[providerId] || '';
  }
  const endpointRow = document.getElementById('customEndpointRow');
  if (endpointRow) endpointRow.style.display = p.supportsCustomEndpoint ? '' : 'none';
  const resultEl = document.getElementById('testApiResult');
  if (resultEl) { resultEl.textContent = ''; resultEl.className = 'provider-test-result'; }
}

// ── 设置自动保存 ──
let autoSaveTimer = null;
function commitSettings(key) {
  state.apiKey = key;
  state.model = document.getElementById('modelSelect').value;
  state.thinkingMode = document.getElementById('thinkingSelect').value;
  state.customPrompt = document.getElementById('customPromptInput').value.trim();
  state.provider = document.getElementById('providerSelect').value;
  state.glossary = document.getElementById('glossaryInput').value.trim();
  safeStore('local', 'prism_key', key);
  safeStore('local', 'prism_rounds', state.rounds);
  safeStore('local', 'prism_model', state.model);
  safeStore('local', 'prism_thinking', state.thinkingMode);
  safeStore('local', 'prism_custom_prompt', state.customPrompt);
  safeStore('local', 'prism_provider', state.provider);
  safeStore('local', 'prism_glossary', state.glossary);
  if (state.customBaseUrls) safeStore('local', 'prism_custom_base_urls', JSON.stringify(state.customBaseUrls));
  buildProviderCards();
  updateProviderConfigPanel(state.provider);
  updateTranslateBtnState();
}

function autoSaveSettings() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const key = document.getElementById('apiKeyInput').value.trim();
    commitSettings(key);
  }, 400);
}

// ── 语言选择模态 ──
function openLangModal(forSrc) {
  state.pickingFor = forSrc ? 'src' : 'tgt';
  document.getElementById('langModalTitle').textContent = forSrc ? '选择源语言' : '选择目标语言';
  document.getElementById('langSearch').value = '';
  renderLangList('');
  document.getElementById('langModal').classList.add('active');
  trapFocus(document.getElementById('langModal'));
  setTimeout(() => document.getElementById('langSearch').focus(), 150);
}
function closeLangModal() {
  document.getElementById('langModal').classList.remove('active');
  releaseFocus();
}
function renderLangList(q) {
  const active = state.pickingFor === 'src' ? state.srcLang : state.tgtLang;
  const ql = q.toLowerCase();
  const filtered = ql ? LANGS.filter(l => l.name.includes(q) || l.label.toLowerCase().includes(ql) || l.code.includes(ql)) : LANGS;
  const list = document.getElementById('langList');
  list.innerHTML = '';
  filtered.forEach(l => {
    const el = document.createElement('div');
    el.className = 'lang-item' + (l.code === active.code ? ' selected' : '');
    el.innerHTML = safeHtml`
      <div class="lang-item-left">
        <div class="lang-flag">${l.flag}</div>
        <div>
          <div class="lang-item-name">${l.name}</div>
          <div class="lang-item-code">${l.label} · ${l.code}</div>
        </div>
      </div>
      <div class="lang-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>
    `;
    el.addEventListener('click', () => {
      if (state.pickingFor === 'src') state.srcLang = l;
      else state.tgtLang = l;
      updateLangDisplay();
      closeLangModal();
    });
    list.appendChild(el);
  });
}

// ── 历史记录渲染 ──
function renderHistoryList() {
  const h = JSON.parse(localStorage.getItem('prism_history') || '[]');
  const list = document.getElementById('historyList');
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
      document.getElementById('sourceText').value = item.src;
      document.getElementById('charNum').textContent = item.src.length;
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
function closeHistoryModal() {
  document.getElementById('historyModal').classList.remove('active');
  releaseFocus();
}

// ── Demo 面板 ──
function showDemoPanel() {
  const modal = document.getElementById('demoPanelModal');
  const grid = document.getElementById('demoPanelGrid');
  if (!grid.dataset.built) {
    grid.innerHTML = DEMO_LIBRARY.map(d =>
      `<button class="demo-card" data-key="${d.key}" style="display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:14px;border:1.5px solid var(--border-cream);border-radius:var(--r-lg);background:var(--ivory);cursor:pointer;transition:all 0.2s;gap:6px;position:relative;overflow:hidden;">
        <div style="font-size:22px;margin-bottom:2px;">${d.icon}</div>
        <div style="font-size:13px;font-weight:600;color:var(--near-black);font-family:var(--sans);">${escHtml(d.title)}</div>
        <div style="font-size:10px;color:var(--stone);line-height:1.4;">${escHtml(d.desc)}</div>
        <div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;">${d.tags.map(t => `<span style="font-size:9px;padding:1px 6px;border-radius:var(--r-full);background:var(--warm-sand);color:var(--olive);font-family:var(--mono);">${escHtml(t)}</span>`).join('')}</div>
        <div style="position:absolute;top:0;right:0;width:40px;height:40px;background:linear-gradient(135deg,transparent 50%,var(--terracotta) 50%);border-radius:0 0 0 var(--r-lg);opacity:0;transition:opacity 0.2s;" class="demo-card-corner"></div>
      </button>`
    ).join('');
    grid.querySelectorAll('.demo-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'var(--terracotta)';
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = 'var(--shadow-md)';
        card.querySelector('.demo-card-corner').style.opacity = '0.8';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'var(--border-cream)';
        card.style.transform = '';
        card.style.boxShadow = '';
        card.querySelector('.demo-card-corner').style.opacity = '0';
      });
      card.addEventListener('click', () => loadDemoText(card.dataset.key));
    });
    grid.dataset.built = 'true';
  }
  modal.style.display = 'flex';
}
function hideDemoPanel() {
  document.getElementById('demoPanelModal').style.display = 'none';
}
function loadDemoText(key) {
  const demo = DEMO_LIBRARY.find(d => d.key === key);
  if (!demo) return;
  const srcL = LANGS.find(l => l.code === demo.srcLang) || LANGS[0];
  const tgtL = LANGS.find(l => l.code === demo.tgtLang) || LANGS[1];
  state.srcLang = srcL;
  state.tgtLang = tgtL;
  updateLangDisplay();
  document.getElementById('sourceText').value = demo.text;
  updateWordStats();
  updateTranslateBtnState();
  safeStore('session', 'prism_text_cache', demo.text);
  hideDemoPanel();
  showToast(`${demo.icon} ${demo.title} 已加载 · ${demo.tags[0]}`, 'success');
  doTranslate();
}

// ── 双语对照 ──
let _bilingualActive = false;
function doBilingualToggle() {
  if (!state.lastTranslation?.result) {
    showToast('请完成一次翻译后使用');
    return;
  }
  const bv = document.getElementById('bilingualView');
  const fr = document.getElementById('finalResult');
  const bb = document.getElementById('bilingualBtn');
  if (_bilingualActive) {
    bv.style.display = 'none'; fr.style.display = ''; _bilingualActive = false;
    if (bb) bb.style.color = '';
    return;
  }
  const srcLines = state.lastTranslation.source.split('\n');
  const tgtLines = state.lastTranslation.result.split('\n');
  const maxLines = Math.max(srcLines.length, tgtLines.length);
  const pairs = [];
  for (let i = 0; i < maxLines; i++) {
    const sl = srcLines[i] || '';
    const tl = tgtLines[i] || '';
    if (!sl.trim() && !tl.trim()) continue;
    pairs.push({ src: escHtml(sl), tgt: _markedLib ? renderMarkdown(tl) : escHtml(tl) });
  }
  let html = '<div class="bilingual-table-wrapper"><table class="bilingual-table"><thead><tr><th style="width:50%;">原文</th><th style="width:50%;">译文</th></tr></thead><tbody>';
  pairs.forEach(p => { html += `<tr><td>${p.src}</td><td>${p.tgt}</td></tr>`; });
  html += '</tbody></table></div>';
  bv.innerHTML = html;
  bv.style.display = 'block';
  fr.style.display = 'none';
  _bilingualActive = true;
  if (bb) bb.style.color = 'var(--terracotta)';
}

// ── 语音输入 ──
let _recognition = null;
let _isVoiceListening = false;
let finalTranscript = '';

export function initVoiceInput() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  _recognition = new SpeechRecognition();
  const voiceBtn = document.getElementById('voiceBtn');
  if (voiceBtn) voiceBtn.style.display = '';
  _recognition.continuous = true;
  _recognition.interimResults = true;

  _recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript += t;
      else interim += t;
    }
    const el = document.getElementById('sourceText');
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = el.value.substring(0, start);
    const after = el.value.substring(end);
    const ins = finalTranscript || interim;
    el.value = before + ins + after;
    const newPos = start + ins.length;
    el.setSelectionRange(newPos, newPos);
    updateWordStats();
    updateTranslateBtnState();
    safeStore('session', 'prism_text_cache', el.value);
    if (finalTranscript) { interim = ''; finalTranscript = ''; }
  };

  _recognition.onerror = (event) => {
    log.warn('语音识别错误:', event.error);
    if (event.error === 'not-allowed') { showToast('麦克风权限被拒绝'); _isVoiceListening = false; updateVoiceBtnState(); }
  };

  _recognition.onend = () => {
    if (_isVoiceListening) {
      try { _recognition.start(); } catch (e) { log.warn('语音识别重启失败:', e); _isVoiceListening = false; updateVoiceBtnState(); }
    }
  };

  document.getElementById('voiceBtn')?.addEventListener('click', () => {
    if (!_recognition) { showToast('当前浏览器不支持语音输入'); return; }
    if (_isVoiceListening) {
      _isVoiceListening = false;
      try { _recognition.stop(); } catch (e) { log.warn('停止失败:', e); }
      updateVoiceBtnState();
      showToast('语音输入已停止');
    } else {
      finalTranscript = '';
      _isVoiceListening = true;
      _recognition.start();
      updateVoiceBtnState();
      showToast('语音输入已启动，请说话...');
    }
  });
}

function updateVoiceBtnState() {
  const btn = document.getElementById('voiceBtn');
  const icon = document.getElementById('voiceIcon');
  if (!btn || !icon) return;
  if (_isVoiceListening) {
    btn.classList.add('active'); btn.classList.remove('pulse');
    icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v0a3 3 0 0 1 5.12-2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
  } else {
    btn.classList.remove('active'); btn.classList.add('pulse');
    icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
  }
}

// ── 清空 ──
function doClearAll() {
  document.getElementById('sourceText').value = '';
  updateWordStats();
  updateTranslateBtnState();
  safeRemove('session', 'prism_text_cache');
  document.getElementById('finalResult').textContent = '';
  document.getElementById('bilingualView').style.display = 'none';
  document.getElementById('finalResult').style.display = '';
  _bilingualActive = false;
  const bilingualBtn = document.getElementById('bilingualBtn');
  if (bilingualBtn) bilingualBtn.style.color = '';
  state.lastTranslation = null;
  finalTranscript = '';
  if (_isVoiceListening) {
    _isVoiceListening = false;
    try { _recognition.stop(); } catch (_) { }
    updateVoiceBtnState();
  }
  document.getElementById('resultSection').classList.remove('active');
  const labelEl = document.querySelector('.result-label');
  labelEl.innerHTML = '最终裁决译文';
  delete labelEl.dataset.earlyPreview;
  document.getElementById('enginePanel').classList.remove('active');
  document.getElementById('roundsContainer').innerHTML = '';
  document.getElementById('auditContainer').innerHTML = '';
  document.getElementById('agentGenSection').style.display = 'none';
  document.getElementById('agentGenBadge').textContent = '进行中';
  document.getElementById('agentGenBadge').classList.remove('done');
  document.getElementById('agentGenBody').style.display = 'none';
  document.getElementById('agentGenTitle').textContent = '量身定制第四位译者...';
  document.getElementById('exportSection').style.display = 'none';
  document.getElementById('sp0').textContent = '忠 —';
  document.getElementById('sp1').textContent = '流 —';
  document.getElementById('sp2').textContent = '地 —';
  ['sp0', 'sp1', 'sp2'].forEach(id => document.getElementById(id).classList.remove('loaded'));
  clearInterval(state.timerInterval);
  document.getElementById('phaseTimer').textContent = '';
}

// ── 3D 彩蛋 ──
function showEasterEgg() {
  if (!window.THREE) return;
  const eggModal = document.getElementById('easterEggModal');
  const canvas = document.getElementById('eggCanvas');
  eggModal.style.display = 'flex';
  canvas.width = 400; canvas.height = 400;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(400, 400);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 3.2;
  const group = new THREE.Group(); scene.add(group);
  const geo = new THREE.OctahedronGeometry(1, 1);
  const mat = new THREE.MeshPhongMaterial({ color: 0xc96442, shininess: 120, specular: 0xffffff, transparent: true, opacity: 0.88, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat); group.add(mesh);
  const wireGeo = new THREE.WireframeGeometry(geo);
  const wireMat = new THREE.LineBasicMaterial({ color: 0xfaf8f2, transparent: true, opacity: 0.08 });
  group.add(new THREE.LineSegments(wireGeo, wireMat));
  const particlesGeo = new THREE.BufferGeometry();
  const pCount = 60;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount * 3; i++) pPos[i] = (Math.random() - 0.5) * 5;
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particlesMat = new THREE.PointsMaterial({ color: 0xfaf8f2, size: 0.018, transparent: true, opacity: 0.5 });
  group.add(new THREE.Points(particlesGeo, particlesMat));
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dirLight = new THREE.DirectionalLight(0xfff5e8, 0.8); dirLight.position.set(3, 3, 5); scene.add(dirLight);
  const backLight = new THREE.DirectionalLight(0xc96442, 0.4); backLight.position.set(-3, -2, -4); scene.add(backLight);
  let time = 0, rafId;
  const texts = document.querySelectorAll('.egg-quote-text');
  let currentText = 0;
  function animate() {
    rafId = requestAnimationFrame(animate);
    time += 0.01;
    mesh.rotation.y = time * 0.8;
    mesh.rotation.x = Math.sin(time * 0.5) * 0.25;
    const s = 1 + Math.sin(time * 1.5) * 0.06;
    mesh.scale.set(s, s, s);
    renderer.render(scene, camera);
  }
  const quoteInterval = setInterval(() => {
    texts[currentText].classList.remove('active');
    currentText = (currentText + 1) % texts.length;
    texts[currentText].classList.add('active');
  }, 3500);
  setTimeout(() => texts[0].classList.add('active'), 200);
  animate();
  document.getElementById('eggCloseBtn').addEventListener('click', function closeEgg() {
    eggModal.style.display = 'none';
    cancelAnimationFrame(rafId);
    clearInterval(quoteInterval);
    renderer.dispose(); geo.dispose(); mat.dispose(); wireGeo.dispose(); wireMat.dispose(); particlesGeo.dispose(); particlesMat.dispose();
    document.getElementById('eggCloseBtn').removeEventListener('click', closeEgg);
  }, { once: true });
  eggModal.addEventListener('click', function overlayClose(e) {
    if (e.target === eggModal) {
      eggModal.style.display = 'none';
      cancelAnimationFrame(rafId);
      clearInterval(quoteInterval);
      renderer.dispose(); geo.dispose(); mat.dispose(); wireGeo.dispose(); wireMat.dispose(); particlesGeo.dispose(); particlesMat.dispose();
      eggModal.removeEventListener('click', overlayClose);
    }
  });
}

// ═════════════════════════════════════════
// 绑定所有事件监听器
// ═════════════════════════════════════════
export function setupEventListeners() {
  // ── 翻译按钮 ──
  document.getElementById('translateBtn').addEventListener('click', doTranslate);
  const translateBtnDesktop = document.getElementById('translateBtnDesktop');
  if (translateBtnDesktop) translateBtnDesktop.addEventListener('click', doTranslate);

  // ── 停止按钮 ──
  document.getElementById('stopBtn').addEventListener('click', doStop);
  document.addEventListener('click', e => { if (e.target.closest('#stopBtnDesktop')) doStop(); });

  // ── 清空 ──
  document.getElementById('clearBtn').addEventListener('click', doClearAll);

  // ── 语言选择 ──
  document.getElementById('srcLangBtn').addEventListener('click', () => openLangModal(true));
  document.getElementById('tgtLangBtn').addEventListener('click', () => openLangModal(false));
  document.getElementById('langModalBack').addEventListener('click', closeLangModal);
  document.getElementById('langModal').addEventListener('click', e => { if (e.target === document.getElementById('langModal')) closeLangModal(); });
  document.getElementById('langSearch').addEventListener('input', function () { renderLangList(this.value.trim()); });

  // ── 语言对调 ──
  document.getElementById('swapBtn').addEventListener('click', () => {
    const btn = document.getElementById('swapBtn');
    btn.classList.add('swapping');
    setTimeout(() => btn.classList.remove('swapping'), 300);
    [state.srcLang, state.tgtLang] = [state.tgtLang, state.srcLang];
    updateLangDisplay();
    if (state.lastTranslation?.result) {
      document.getElementById('sourceText').value = state.lastTranslation.result;
      updateWordStats();
      updateTranslateBtnState();
      document.getElementById('resultSection').classList.remove('active');
      document.getElementById('enginePanel').classList.remove('active');
      document.getElementById('roundsContainer').innerHTML = '';
      document.getElementById('auditContainer').innerHTML = '';
      document.getElementById('exportSection').style.display = 'none';
    }
  });

  // ── 文本输入 ──
  document.getElementById('sourceText').addEventListener('input', function () {
    updateWordStats();
    if (this.value.length > 20) detectAndApplyLang(this.value);
    safeStore('session', 'prism_text_cache', this.value);
    updateTranslateBtnState();
  });

  document.getElementById('sourceText').addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doTranslate(); }
  });

  // ── 粘贴 ──
  document.getElementById('pasteBtn').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('sourceText').value = text;
      updateWordStats();
      updateTranslateBtnState();
      safeStore('session', 'prism_text_cache', text);
      showToast('已粘贴', 'success');
    } catch (_) { showToast('无法访问剪贴板'); }
  });

  // ── 文件上传 ──
  const fileDropZone = document.getElementById('fileDropZone');
  const fileInput = document.getElementById('fileInput');
  fileDropZone.addEventListener('click', () => { fileInput.value = ''; fileInput.click(); });
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length === 1) { handleFileSelect(files[0]); return; }
  });
  fileDropZone.addEventListener('dragover', e => { e.preventDefault(); fileDropZone.classList.add('drag-over'); });
  fileDropZone.addEventListener('dragleave', () => fileDropZone.classList.remove('drag-over'));
  fileDropZone.addEventListener('drop', e => {
    e.preventDefault();
    fileDropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  });
  document.getElementById('fileClearBtn').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('fileLoadedBar').classList.remove('visible');
    document.getElementById('fileInput').value = '';
    showToast('已移除文件');
  });

  // ── API 输入 ──
  document.getElementById('apiKeyInput')?.addEventListener('input', updateTranslateBtnState);

  // ── 设置 ──
  document.getElementById('settingsBtn').addEventListener('click', openDrawer);
  document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);
  document.getElementById('roundsMinus').addEventListener('click', () => {
    if (state.rounds > 1) { state.rounds--; document.getElementById('roundsDisplay').textContent = state.rounds; }
  });
  document.getElementById('roundsPlus').addEventListener('click', () => {
    if (state.rounds < 5) { state.rounds++; document.getElementById('roundsDisplay').textContent = state.rounds; }
  });
  document.getElementById('keyToggle').addEventListener('click', () => {
    const inp = document.getElementById('apiKeyInput');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });
  document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    const key = document.getElementById('apiKeyInput').value.trim();
    if (!key) { showToast('请输入 API 密钥'); return; }
    commitSettings(key);
    showToast('设置已保存', 'success');
    closeDrawer();
  });

  // ── Provider 联动 ──
  document.getElementById('providerSelect').addEventListener('change', function () {
    state.provider = this.value;
    updateModelOptions();
    updateProviderConfigPanel(state.provider);
    buildProviderCards();
    autoSaveSettings();
  });

  // ── 自动保存 ──
  ['apiKeyInput', 'modelSelect', 'thinkingSelect', 'customPromptInput', 'glossaryInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', autoSaveSettings);
  });
  document.getElementById('apiKeyInput')?.addEventListener('input', autoSaveSettings);
  document.getElementById('roundsMinus')?.addEventListener('click', () => setTimeout(autoSaveSettings, 50));
  document.getElementById('roundsPlus')?.addEventListener('click', () => setTimeout(autoSaveSettings, 50));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  // ── 自定义端点 ──
  document.getElementById('customEndpointInput')?.addEventListener('input', function () {
    if (!state.customBaseUrls) state.customBaseUrls = {};
    state.customBaseUrls[state.provider] = this.value.trim() || '';
    safeStore('local', 'prism_custom_base_urls', JSON.stringify(state.customBaseUrls));
  });

  // ── 测试连接 ──
  document.getElementById('testApiBtn')?.addEventListener('click', async function () {
    const btn = document.getElementById('testApiBtn');
    const resultEl = document.getElementById('testApiResult');
    if (!state.apiKey) {
      resultEl.textContent = '❌ 请先填写 API 密钥';
      resultEl.className = 'provider-test-result error'; return;
    }
    btn.disabled = true;
    btn.classList.add('testing');
    btn.innerHTML = '<span class="spinner">◌</span> 测试中...';
    resultEl.textContent = '';
    resultEl.className = 'provider-test-result';
    const r = await testApiConnection();
    btn.disabled = false;
    btn.classList.remove('testing');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> 测试连接';
    if (r.success) {
      state.lastTestedProvider = state.provider;
      resultEl.textContent = '✓ 连接成功！';
      resultEl.className = 'provider-test-result success';
      buildProviderCards();
      updateTranslateBtnState();
      showToast('✓ ' + findProvider(state.provider).name + ' 连接成功', 'success');
    } else {
      resultEl.textContent = '❌ ' + (r.error || '连接失败');
      resultEl.className = 'provider-test-result error';
      showToast('❌ ' + (r.error || '连接失败'), 'error');
    }
  });

  // ── 历史记录 ──
  document.getElementById('historyBtn').addEventListener('click', () => {
    renderHistoryList();
    document.getElementById('historyModal').classList.add('active');
    trapFocus(document.getElementById('historyModal'));
  });
  document.getElementById('historyClose').addEventListener('click', closeHistoryModal);
  document.getElementById('historyModal').addEventListener('click', e => { if (e.target === document.getElementById('historyModal')) closeHistoryModal(); });
  document.getElementById('historyClearAll').addEventListener('click', () => {
    if (!confirm('确认清空全部翻译历史？')) return;
    safeRemove('local', 'prism_history');
    updateHistoryBadge();
    renderHistoryList();
  });

  // ── Demo ──
  document.getElementById('demoBtn')?.addEventListener('click', showDemoPanel);
  document.getElementById('demoPanelClose')?.addEventListener('click', hideDemoPanel);
  document.getElementById('demoPanelModal')?.addEventListener('click', e => { if (e.target === document.getElementById('demoPanelModal')) hideDemoPanel(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('demoPanelModal').style.display === 'flex') hideDemoPanel();
  });

  // ── 复制 & 朗读 ──
  let isSpeaking = false;
  document.getElementById('copyBtn').addEventListener('click', async () => {
    const text = document.getElementById('finalResult').textContent;
    if (!text) return;
    const btn = document.getElementById('copyBtn');
    const result = await copyToClipboard(text);
    if (result.success) {
      btn.classList.add('success');
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>已复制`;
      setTimeout(() => {
        btn.classList.remove('success');
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>复制`;
      }, 2000);
    } else {
      showToast('复制失败，请手动选中文本');
    }
  });

  document.getElementById('speakBtn').addEventListener('click', () => {
    if (!window.speechSynthesis) { showToast('当前浏览器不支持朗读'); return; }
    if (isSpeaking) { speechSynthesis.cancel(); isSpeaking = false; document.getElementById('speakBtn').style.color = ''; return; }
    const text = document.getElementById('finalResult').textContent;
    if (!text) { showToast('暂无译文可朗读'); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = state.tgtLang.code + '-' + state.tgtLang.code.toUpperCase();
    u.onend = () => { isSpeaking = false; document.getElementById('speakBtn').style.color = ''; };
    u.onerror = () => { isSpeaking = false; document.getElementById('speakBtn').style.color = ''; };
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    isSpeaking = true;
    document.getElementById('speakBtn').style.color = 'var(--terracotta)';
  });

  // ── 双语对照 ──
  document.getElementById('bilingualBtn')?.addEventListener('click', doBilingualToggle);

  // ── 快捷键面板 ──
  document.getElementById('shortcutBtn')?.addEventListener('click', () => {
    document.getElementById('shortcutPanel')?.classList.add('active');
  });
  document.getElementById('shortcutClose')?.addEventListener('click', () => {
    document.getElementById('shortcutPanel')?.classList.remove('active');
  });
  document.getElementById('shortcutPanel')?.addEventListener('click', e => {
    if (e.target === document.getElementById('shortcutPanel')) document.getElementById('shortcutPanel')?.classList.remove('active');
  });

  // ── 快捷键系统 ──
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'k': e.preventDefault(); openDrawer(); break;
        case 'h': e.preventDefault(); renderHistoryList(); document.getElementById('historyModal').classList.add('active'); trapFocus(document.getElementById('historyModal')); break;
        case 'v': e.preventDefault(); document.getElementById('pasteBtn').click(); break;
        case 'c': e.preventDefault(); document.getElementById('copyBtn').click(); break;
        case 's': e.preventDefault(); document.getElementById('voiceBtn')?.click(); break;
        case 'm': e.preventDefault(); doBilingualToggle(); break;
        case 'l': e.preventDefault(); doClearAll(); break;
        case 'r': e.preventDefault(); document.getElementById('swapBtn').click(); break;
        case 'd': e.preventDefault(); showDemoPanel(); break;
        case 'x': e.preventDefault(); doStop(); break;
      }
    }
  });

  // ── 导出按钮 ──
  setupExportListeners();

  // ── Konami Code ──
  const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let _konamiIndex = 0;
  let _konamiReady = false;

  if (typeof THREE === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    s.onload = () => { _konamiReady = true; };
    document.head.appendChild(s);
  } else {
    _konamiReady = true;
  }

  document.addEventListener('keydown', (e) => {
    if (!_konamiReady) return;
    if (e.key === KONAMI_CODE[_konamiIndex]) {
      _konamiIndex++;
      if (_konamiIndex === KONAMI_CODE.length) {
        _konamiIndex = 0;
        showEasterEgg();
      }
    } else {
      _konamiIndex = 0;
    }
  });

  // ── 滚动提示 ──
  const rightPanel = getPanelRight();
  if (rightPanel) {
    rightPanel.addEventListener('scroll', () => {
      const h = document.querySelector('.scroll-hint');
      if (!h) return;
      if (rightPanel.scrollTop > 50) { h.style.opacity = '0'; h.style.pointerEvents = 'none'; }
      else { h.style.opacity = '1'; h.style.pointerEvents = ''; }
    });
  }

  // ── 双击滚轮保护 ──
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  if (!isMac && rightPanel) {
    rightPanel.addEventListener('wheel', (e) => {
      const { scrollTop, scrollHeight, clientHeight } = rightPanel;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 2;
      if (e.deltaY > 0 && atBottom) e.preventDefault();
    }, { passive: false });
  }
}
