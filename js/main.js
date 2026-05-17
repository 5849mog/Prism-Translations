// main.js — 入口与全局初始化

const DEMO_TEXT = `在世界人工智能大会的开幕式上，百度创始人李彦宏发表了题为《译者时代》的主旨演讲。他指出，大语言模型已经从"炫技"阶段迈入"应用"阶段，而译者（Agent）将成为连接用户与服务的核心枢纽。\n\n"未来的互联网将不再是你去搜索信息，而是译者主动为你完成任务。"李彦宏以医疗健康领域为例，阐述了 AI 译者如何帮助患者完成从症状描述、医院推荐到挂号预约的全流程服务。他强调，这一转变需要解决三大挑战：数据隐私保护、多模态交互能力、以及可解释性。\n\n演讲尾声，他引用了一句古希腊哲言："认识你自己。"并补充道，"而在 AI 时代，我们更需要让 AI 认识每一个独特的你。"`;

// ── 1. 文件拖拽上传 ──
const fileDropZone = document.getElementById('fileDropZone');
const fileInput = document.getElementById('fileInput');

fileDropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFileSelect(e.target.files[0]); });

fileDropZone.addEventListener('dragover', e => { e.preventDefault(); fileDropZone.classList.add('drag-over'); });
fileDropZone.addEventListener('dragleave', () => fileDropZone.classList.remove('drag-over'));
fileDropZone.addEventListener('drop', e => {
  e.preventDefault(); fileDropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelect(file);
});

document.getElementById('fileClearBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('fileLoadedBar').classList.remove('visible');
  document.getElementById('fileInput').value = '';
  showToast('已移除文件');
});

// ── 2. 文本输入联动 ──
document.getElementById('sourceText').addEventListener('input', function() {
  updateWordStats();
  if (this.value.length > 20) detectAndApplyLang(this.value);
  sessionStorage.setItem(TEXT_CACHE_KEY, this.value);
  updateTranslateBtnState();
});

// ── 3. 按钮状态联动 ──
function updateTranslateBtnState() {
  const hasText = document.getElementById('sourceText').value.trim().length > 0;
  const hasKey = !!state.apiKey;
  const btns = [document.getElementById('translateBtn'), document.getElementById('translateBtnDesktop')];
  btns.forEach(btn => {
    if (!btn) return;
    if (!hasText || !hasKey) {
      btn.disabled = true;
      if (!hasKey) btn.title = '请先填写 API 密钥';
      else if (!hasText) btn.title = '请输入待翻译文本';
    } else {
      btn.disabled = false;
      btn.title = '';
    }
  });
}

// 页面加载时恢复缓存文本
(function restoreTextCache() {
  const cached = sessionStorage.getItem(TEXT_CACHE_KEY);
  if (cached && cached.trim()) {
    const el = document.getElementById('sourceText');
    if (el && !el.value.trim()) {
      el.value = cached;
      updateWordStats();
      updateTranslateBtnState();
    }
  }
})();

document.getElementById('apiKeyInput')?.addEventListener('input', updateTranslateBtnState);

// ── 4. 翻译按钮 ──
document.getElementById('translateBtn')?.addEventListener('click', doTranslate);
const translateBtnDesktop = document.getElementById('translateBtnDesktop');
if (translateBtnDesktop) translateBtnDesktop.addEventListener('click', doTranslate);

// ── 5. 一键示例 ──
document.getElementById('demoBtn')?.addEventListener('click', () => {
  document.getElementById('sourceText').value = DEMO_TEXT;
  updateWordStats();
  updateTranslateBtnState();
  sessionStorage.setItem(TEXT_CACHE_KEY, DEMO_TEXT);
  showToast('示例文本已加载，点击启动翻译体验完整流程', 'success');
  document.getElementById('sourceText').focus();
});

// ── 6. 历史记录 ──
document.getElementById('historyBtn').addEventListener('click', () => {
  renderHistoryList();
  document.getElementById('historyModal').classList.add('active');
});
document.getElementById('historyClose').addEventListener('click', closeHistoryModal);
document.getElementById('historyModal').addEventListener('click', e => { if (e.target === document.getElementById('historyModal')) closeHistoryModal(); });
document.getElementById('historyClearAll').addEventListener('click', () => {
  if (!confirm('确认清空全部翻译历史？')) return;
  localStorage.removeItem('prism_history');
  updateHistoryBadge();
  renderHistoryList();
});

// ── 7. 设置面板 ──
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
document.getElementById('settingsBtn').addEventListener('click', openDrawer);
document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);

// ── 8. 语言选择 ──
document.getElementById('srcLangBtn').addEventListener('click', () => openLangModal(true));
document.getElementById('tgtLangBtn').addEventListener('click', () => openLangModal(false));
document.getElementById('langModalBack').addEventListener('click', closeLangModal);
document.getElementById('langModal').addEventListener('click', e => { if (e.target === document.getElementById('langModal')) closeLangModal(); });
document.getElementById('langSearch').addEventListener('input', function() { renderLangList(this.value.trim()); });
document.getElementById('swapBtn').addEventListener('click', () => {
  const tmp = state.srcLang; state.srcLang = state.tgtLang; state.tgtLang = tmp;
  updateLangDisplay(); setTimeout(() => document.getElementById('swapBtn').classList.toggle('swapping'), 50);
});

// ── 9. 轮次控制 ──
document.getElementById('roundsMinus').addEventListener('click', () => { if (state.rounds > 1) { state.rounds--; document.getElementById('roundsDisplay').textContent = state.rounds; } });
document.getElementById('roundsPlus').addEventListener('click', () => { if (state.rounds < 5) { state.rounds++; document.getElementById('roundsDisplay').textContent = state.rounds; } });

// ── 10. 密钥显隐 ──
document.getElementById('keyToggle').addEventListener('click', () => {
  const inp = document.getElementById('apiKeyInput');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

// ── 11. 停止按钮 ──
document.getElementById('stopBtn').addEventListener('click', doStop);
document.addEventListener('click', e => { if (e.target.closest('#stopBtnDesktop')) doStop(); });

// ── 12. 导出 ──
document.getElementById('exportBtn')?.addEventListener('click', triggerDownload);
document.getElementById('exportPreviewBtn')?.addEventListener('click', openPreviewModal);

// ── 13. Provider-模型联动 ──
document.getElementById('providerSelect').addEventListener('change', () => {
  const prov = document.getElementById('providerSelect').value;
  state.provider = prov;
  updateModelOptions();
  autoSaveSettings();
});

// ── 14. 自动保存设置 ──
['apiKeyInput', 'modelSelect', 'thinkingSelect', 'customPromptInput', 'glossaryInput'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', autoSaveSettings);
});
document.getElementById('apiKeyInput')?.addEventListener('input', autoSaveSettings);
document.getElementById('roundsMinus')?.addEventListener('click', () => { setTimeout(autoSaveSettings, 50); });
document.getElementById('roundsPlus')?.addEventListener('click', () => { setTimeout(autoSaveSettings, 50); });

// ── 15. 初始化 ──
function init() {
  document.getElementById('roundsDisplay').textContent = state.rounds;
  if (state.apiKey) document.getElementById('apiKeyInput').value = state.apiKey;
  document.getElementById('modelSelect').value = state.model;
  document.getElementById('thinkingSelect').value = state.thinkingMode;
  document.getElementById('providerSelect').value = state.provider;
  if (state.customPrompt) document.getElementById('customPromptInput').value = state.customPrompt;
  if (state.glossary) document.getElementById('glossaryInput').value = state.glossary;
  updateLangDisplay();
  updateHistoryBadge();
  updateTranslateBtnState();
}

init();
