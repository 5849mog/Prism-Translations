/**
 * 设置面板 — Provider 联动、自动保存、配置面板
 */
import { state } from './state.js';
import { safeStore } from './storage.js';
import { escHtml, updateTranslateBtnState } from './utils.js';
import {
  PROVIDER_REGISTRY, findProvider, getProviderName, getProviderDescription,
  getProviderSupportsThinking, getProviderModels,
} from './providers.js';
import { ID } from './dom-ids.js';

// ── Provider 模型联动 ──
export function updateModelOptions() {
  const provider = document.getElementById(ID.PROVIDER_SELECT).value;
  const modelSelect = document.getElementById(ID.MODEL_SELECT);
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
  const keyLabel = document.getElementById(ID.API_KEY_LABEL);
  if (keyLabel) keyLabel.textContent = getProviderName(provider) + ' API 密钥';
  const modelDesc = document.getElementById(ID.MODEL_SELECT_DESC);
  if (modelDesc) modelDesc.textContent = getProviderDescription(provider);
  const thinkRow = document.getElementById(ID.THINKING_SELECT) ? document.getElementById(ID.THINKING_SELECT).closest('.setting-row.stacked') : null;
  if (thinkRow) thinkRow.style.display = getProviderSupportsThinking(provider) ? '' : 'none';
}

// ── Provider 卡片 ──
export function buildProviderCards() {
  const grid = document.getElementById(ID.PROVIDER_GRID);
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
      document.getElementById(ID.PROVIDER_SELECT).value = p.id;
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

export function updateProviderConfigPanel(providerId) {
  const p = findProvider(providerId);
  if (!p) return;
  const header = document.getElementById(ID.PROVIDER_CONFIG_HEADER);
  if (header) header.textContent = p.name + ' · ' + p.description;
  const label = document.getElementById(ID.API_KEY_LABEL);
  if (label) label.textContent = p.name + ' API 密钥';
  const endpointInput = document.getElementById(ID.CUSTOM_ENDPOINT_INPUT);
  if (endpointInput && state.customBaseUrls) {
    endpointInput.value = state.customBaseUrls[providerId] || '';
  }
  const endpointRow = document.getElementById(ID.CUSTOM_ENDPOINT_ROW);
  if (endpointRow) endpointRow.style.display = p.supportsCustomEndpoint ? '' : 'none';
  const resultEl = document.getElementById(ID.TEST_API_RESULT);
  if (resultEl) { resultEl.textContent = ''; resultEl.className = 'provider-test-result'; }
}

// ── 设置自动保存 ──
let autoSaveTimer = null;

export function commitSettings(key) {
  state.apiKey = key;
  state.model = document.getElementById(ID.MODEL_SELECT).value;
  state.thinkingMode = document.getElementById(ID.THINKING_SELECT).value;
  state.customPrompt = document.getElementById(ID.CUSTOM_PROMPT_INPUT).value.trim();
  state.provider = document.getElementById(ID.PROVIDER_SELECT).value;
  state.glossary = document.getElementById(ID.GLOSSARY_INPUT).value.trim();
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

export function autoSaveSettings() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const key = document.getElementById(ID.API_KEY_INPUT).value.trim();
    commitSettings(key);
  }, 400);
}
